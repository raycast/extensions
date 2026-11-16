import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, createElement } from "react";
import { mockRaycastUi, navigation, setFormValues } from "./raycastUiMock";

const transportGlobals = {
  Response,
  Request,
  Headers,
  ReadableStream,
  WritableStream,
  TransformStream,
};
GlobalRegistrator.register();
Object.assign(globalThis, transportGlobals);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const originalFetch = globalThis.fetch;
mockRaycastUi();
const { RenameTagForm } = await import("../components/TagForms");

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let starts: unknown[];

// Teak takes the rename and finishes it, or refuses it as a name in use.
const serve = (refuse = false) => {
  starts = [];
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    starts.push(init?.body ? JSON.parse(String(init.body)) : null);
    if (refuse) {
      return Promise.resolve(
        Response.json(
          { code: "TAG_EXISTS", error: "A tag with that name exists" },
          { status: 409 },
        ),
      );
    }
    return Promise.resolve(
      Response.json({
        changed: 3,
        id: "op_1",
        kind: "rename",
        status: "completed",
        total: 3,
      }),
    );
  }) as typeof fetch;
};
const settle = () =>
  act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
const renameButton = () =>
  Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Rename Tag",
  );
const render = async () => {
  await act(() => {
    root.render(
      createElement(RenameTagForm, {
        onFinished: () => undefined,
        tag: { count: 3, name: "design" },
      }),
    );
    return Promise.resolve();
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  navigation.pops = 0;
});
afterEach(async () => {
  await act(() => {
    root.unmount();
    return Promise.resolve();
  });
  container.remove();
  globalThis.fetch = originalFetch;
});
afterAll(() => GlobalRegistrator.unregister());

test("a rename that only changes capitals goes to Teak", async () => {
  serve();
  setFormValues({ name: "Design" });
  await render();
  await act(async () => renameButton()?.click());
  await settle();
  expect(starts).toHaveLength(1);
  expect(JSON.stringify(starts[0])).toContain("Design");
  expect(navigation.pops).toBe(1);
});

test("a second submit while the rename starts sends nothing more", async () => {
  serve();
  setFormValues({ name: "Research" });
  await render();
  // Both presses land before the first request answers.
  await act(() => {
    renameButton()?.click();
    renameButton()?.click();
    return Promise.resolve();
  });
  await settle();
  expect(starts).toHaveLength(1);
  expect(navigation.pops).toBe(1);
});

test("a rename Teak refuses keeps the form open", async () => {
  serve(true);
  setFormValues({ name: "Research" });
  await render();
  await act(async () => renameButton()?.click());
  await settle();
  expect(starts).toHaveLength(1);
  expect(navigation.pops).toBe(0);
});

test("leaving the form before Teak answers closes nothing else", async () => {
  starts = [];
  let answer: (response: Response) => void = () => undefined;
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    starts.push(init?.body ? JSON.parse(String(init.body)) : null);
    return new Promise<Response>((resolve) => {
      answer = resolve;
    });
  }) as typeof fetch;
  setFormValues({ name: "Research" });
  await render();
  await act(async () => renameButton()?.click());
  // Esc: the form closes while the rename is still starting.
  await act(() => {
    root.render(null);
    return Promise.resolve();
  });
  await act(() => {
    answer(
      Response.json({
        changed: 3,
        id: "op_1",
        kind: "rename",
        status: "completed",
        total: 3,
      }),
    );
    return Promise.resolve();
  });
  await settle();
  expect(starts).toHaveLength(1);
  expect(navigation.pops).toBe(0);
});
