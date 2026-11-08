import assert from "node:assert/strict";
import { mock, test, type TestContext } from "node:test";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { ReactElement } from "react";
import {
  BedrockRuntimeClient,
  type ConverseStreamOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { SourceForm, useSource, type Source } from "../src/source";
import { ResultView } from "../src/result-view";
import { state, reset, api } from "./raycast-mock.cjs";

const source: Source = { text: "  Original text\n", frontApp: "TextEdit" };
async function mount(
  t: TestContext,
  element: ReactElement,
): Promise<ReactTestRenderer> {
  let view!: ReactTestRenderer;
  await act(async () => {
    view = create(element);
  });
  t.after(async () => {
    await act(async () => view.unmount());
  });
  return view;
}
function action(view: ReactTestRenderer, title: string) {
  const result = view.root
    .findAllByType(api.Action)
    .find((node) => node.props.title === title);
  assert.ok(result, `Missing action: ${title}`);
  return result;
}
async function* completed(text: string): AsyncIterable<ConverseStreamOutput> {
  yield { contentBlockDelta: { contentBlockIndex: 0, delta: { text } } };
  yield { messageStop: { stopReason: "end_turn" } };
}

test("shared form validation rejects empty and whitespace-only fields, and preserves source formatting", async (t) => {
  let submitted: { source: Source; instruction?: string } | undefined;
  const view = await mount(
    t,
    <SourceForm
      source={source}
      custom
      onSubmit={(source, instruction) => {
        submitted = { source, instruction };
      }}
    />,
  );
  const submit = () =>
    view.root.findByType(api.Action.SubmitForm).props.onSubmit;
  await act(async () => {
    await submit()({ text: " \n", instruction: "  " });
  });
  assert.equal(submitted, undefined);
  assert.ok(view.root.findByType(api.Form.TextArea).props.error);
  assert.ok(view.root.findByType(api.Form.TextField).props.error);
  await act(async () => {
    await submit()({ text: source.text, instruction: "  Shorten this  " });
  });
  assert.deepEqual(submitted, { source, instruction: "Shorten this" });
});

test("default-tone form does not require a custom instruction", async (t) => {
  let submitted = false;
  const view = await mount(
    t,
    <SourceForm
      source={source}
      onSubmit={() => {
        submitted = true;
      }}
    />,
  );
  await act(async () => {
    await view.root
      .findByType(api.Action.SubmitForm)
      .props.onSubmit({ text: source.text });
  });
  assert.equal(submitted, true);
});

test("source hook captures once and falls back to manual input when selection is unsupported", async (t) => {
  const selected = mock.method(state, "selectedText", async () => {
    throw new Error("Unsupported selection");
  });
  const front = mock.method(state, "frontApp", async () => ({
    name: "TextEdit",
  }));
  t.after(() => {
    selected.mock.restore();
    front.mock.restore();
  });
  let captured: Source | undefined;
  function Capture() {
    captured = useSource();
    return null;
  }
  const view = await mount(t, <Capture />);
  assert.deepEqual(captured, { text: "", frontApp: "TextEdit" });
  await act(async () => view.update(<Capture />));
  assert.equal(selected.mock.callCount(), 1);
});

test("cancel retains the last completed rewrite; retry reads current preferences", async (t) => {
  reset();
  const modelIds: string[] = [];
  let signal: AbortSignal | undefined;
  let count = 0;
  const send = mock.method(
    BedrockRuntimeClient.prototype,
    "send",
    async (
      command: { input: { modelId: string } },
      options: { abortSignal: AbortSignal },
    ) => {
      modelIds.push(command.input.modelId);
      count++;
      if (count === 2) {
        signal = options.abortSignal;
        return new Promise(() => {});
      }
      return {
        stream: completed(count === 1 ? "First rewrite" : "New rewrite"),
      };
    },
  );
  t.after(() => send.mock.restore());
  const view = await mount(t, <ResultView source={source} tone="friendly" />);
  assert.equal(
    view.root.findByType(api.Action.Paste).props.content,
    "First rewrite",
  );
  await act(async () => {
    void action(view, "Rewrite Again").props.onAction();
  });
  assert.equal(view.root.findByType(api.Detail).props.isLoading, true);
  assert.equal(view.root.findAllByType(api.Action.Paste).length, 0);
  assert.deepEqual(action(view, "Cancel Rewrite").props.shortcut, {
    modifiers: ["cmd"],
    key: ".",
  });
  await act(async () => {
    action(view, "Cancel Rewrite").props.onAction();
  });
  assert.equal(signal?.aborted, true);
  assert.match(
    view.root.findByType(api.Detail).props.markdown,
    /Rewrite canceled/,
  );
  assert.equal(
    view.root.findByType(api.Action.Paste).props.content,
    "First rewrite",
  );
  state.preferences.modelId = "anthropic.claude-sonnet-5-5";
  await act(async () => {
    await action(view, "Retry Rewrite").props.onAction();
  });
  assert.equal(
    view.root.findByType(api.Action.Paste).props.content,
    "New rewrite",
  );
  assert.equal(modelIds[2], "global.anthropic.claude-sonnet-5-5");
  assert.deepEqual(state.toasts, []);
});

test("unmounting cancels the pending Bedrock call", async () => {
  let signal: AbortSignal | undefined;
  const send = mock.method(
    BedrockRuntimeClient.prototype,
    "send",
    (_command: unknown, options: { abortSignal: AbortSignal }) => {
      signal = options.abortSignal;
      return new Promise(() => {});
    },
  );
  let view!: ReactTestRenderer;
  try {
    await act(async () => {
      view = create(<ResultView source={source} tone="friendly" />);
    });
    assert.equal(signal?.aborted, false);
    await act(async () => view.unmount());
    assert.equal(signal?.aborted, true);
  } finally {
    send.mock.restore();
  }
});

test("partial output cannot be pasted, including after cancellation or a late stream event", async (t) => {
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  async function* partialStream(): AsyncIterable<ConverseStreamOutput> {
    yield {
      contentBlockDelta: { contentBlockIndex: 0, delta: { text: "Partial" } },
    };
    await gate;
    yield {
      contentBlockDelta: {
        contentBlockIndex: 0,
        delta: { text: " stale output" },
      },
    };
    yield { messageStop: { stopReason: "end_turn" } };
  }
  const send = mock.method(
    BedrockRuntimeClient.prototype,
    "send",
    async () => ({ stream: partialStream() }),
  );
  t.after(() => send.mock.restore());
  const view = await mount(t, <ResultView source={source} tone="friendly" />);
  assert.match(view.root.findByType(api.Detail).props.markdown, /Partial/);
  assert.equal(view.root.findAllByType(api.Action.Paste).length, 0);
  await act(async () => {
    action(view, "Cancel Rewrite").props.onAction();
  });
  await act(async () => {
    finish();
  });
  assert.match(
    view.root.findByType(api.Detail).props.markdown,
    /Rewrite canceled/,
  );
  assert.doesNotMatch(
    view.root.findByType(api.Detail).props.markdown,
    /stale output|Partial/,
  );
  assert.equal(view.root.findAllByType(api.Action.Paste).length, 0);
});
