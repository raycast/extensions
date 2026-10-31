import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { storage, storageState } from "./fixtures/storage-host.ts";

// Raycast renders native components, so exercise the real command against a
// host-component adapter. Storage is simulated; native app behavior is separate.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return nextResolve(
        new URL("./fixtures/raycast-host.ts", import.meta.url).href,
        context,
      );
    }
    if (specifier === "@raycast/utils") {
      return nextResolve(
        new URL("./fixtures/storage-host.ts", import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { default: Command } = await import("../src/number-to-stacks.tsx");
type CommandProps = Parameters<typeof Command>[0];
const renderers: ReactTestRenderer[] = [];

async function render(query?: string, fallbackText?: string) {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      createElement(Command, {
        arguments: { query },
        fallbackText,
      } as CommandProps),
    );
  });
  renderers.push(renderer!);
  return renderer!;
}

function item(renderer: ReactTestRenderer) {
  return renderer.root.findByType("article");
}

async function search(renderer: ReactTestRenderer, query: string) {
  await act(async () => {
    renderer.root.findByType("main").props.onSearchTextChange(query);
  });
}

async function selectStackSize(
  renderer: ReactTestRenderer,
  stackSize: "16" | "64",
) {
  await act(async () => {
    await renderer.root.findByType("select").props.onChange(stackSize);
  });
}

beforeEach(() => {
  storage.clear();
  storageState.loading = false;
  storageState.writes = 0;
});

afterEach(async () => {
  await act(async () => {
    for (const renderer of renderers.splice(0)) renderer.unmount();
  });
});

describe("Raycast command", () => {
  it("opens a root-search fallback query and exposes its exact result for copying", async () => {
    const renderer = await render(undefined, "144 to stacks");
    assert.equal(item(renderer).props.title, "2 stacks and 16 items");
    assert.equal(
      renderer.root.findByType("main").props.searchText,
      "144 to stacks",
    );
    assert.equal(
      renderer.root.findByType("button").props.content,
      "2 stacks and 16 items",
    );
  });

  it("opens an alias argument and prefers it over fallback text", async () => {
    const renderer = await render("96", "144 to stacks");
    assert.equal(item(renderer).props.title, "1 stack and 32 items");
  });

  it("updates live input, switches conversion direction, and updates the copy action", async () => {
    const renderer = await render("96");
    await search(renderer, "1.5 stacks");
    assert.equal(item(renderer).props.title, "96 items");
    assert.equal(renderer.root.findByType("button").props.content, "96 items");
    await search(renderer, "2 stacks and 16 items to items");
    assert.equal(item(renderer).props.title, "144 items");
    await search(renderer, "64");
    assert.equal(item(renderer).props.title, "1 stack");
  });

  it("uses the dropdown selection in both directions and restores it on remount", async () => {
    const renderer = await render("96");
    await selectStackSize(renderer, "16");
    assert.equal(item(renderer).props.title, "6 stacks");
    assert.equal(renderer.root.findByType("select").props.value, "16");
    assert.deepEqual(item(renderer).props.accessories, [
      { text: "16 items / stack" },
    ]);
    await search(renderer, "1.5 stacks");
    assert.equal(item(renderer).props.title, "24 items");
    await act(async () => renderer.unmount());
    const reopened = await render(undefined, "2 stacks and 16 items");
    assert.equal(item(reopened).props.title, "48 items");
    assert.equal(reopened.root.findByType("select").props.value, "16");
    await selectStackSize(reopened, "64");
    assert.equal(item(reopened).props.title, "144 items");
  });

  it("shows validation without a stale copy action, then recovers after correction", async () => {
    const renderer = await render("96");
    await search(renderer, "0.1 stacks");
    assert.match(
      renderer.root.findByType("aside").props.description,
      /No rounding/,
    );
    assert.equal(renderer.root.findAllByType("button").length, 0);
    assert.equal(renderer.root.findAllByType("article").length, 0);
    await search(renderer, "2 stacks");
    assert.equal(item(renderer).props.title, "128 items");
    await search(renderer, "");
    assert.equal(renderer.root.findAllByType("button").length, 0);
  });

  it("hides results and copy actions until the saved stack size is loaded", async () => {
    storageState.loading = true;
    const renderer = await render("96");
    assert.equal(renderer.root.findByType("main").props.isLoading, true);
    assert.equal(renderer.root.findAllByType("article").length, 0);
    assert.equal(renderer.root.findAllByType("button").length, 0);
  });

  it("keeps the result and dropdown mounted while the saved size is refreshed", async () => {
    const renderer = await render("111");
    const dropdown = renderer.root.findByType("select");
    storageState.loading = true;
    await act(async () => {
      renderer.update(
        createElement(Command, { arguments: { query: "111" } } as CommandProps),
      );
    });
    assert.equal(
      renderer.root.findAllByType("article").length,
      1,
      "The result disappeared during a storage refresh, matching the recorded flicker",
    );
    assert.equal(item(renderer).props.title, "1 stack and 47 items");
    assert.equal(renderer.root.findByType("select"), dropdown);
    assert.equal(
      renderer.root.findByType("button").props.content,
      "1 stack and 47 items",
    );
  });

  it("does not write the selected stack size again for an unchanged dropdown notification", async () => {
    const renderer = await render("111");
    for (let repeat = 0; repeat < 3; repeat++)
      await selectStackSize(renderer, "64");
    assert.equal(
      storageState.writes,
      0,
      "Unchanged dropdown notifications must not restart storage refreshes",
    );
  });
});
