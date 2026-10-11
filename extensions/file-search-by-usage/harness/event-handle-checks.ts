import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { useEventHandles } from "../src/components/use-event-handles";

/** Model native controls retaining event handlers after their owner unmounts. */
export async function eventHandleChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const calls: string[] = [];
  const retained: (() => void)[] = [];
  function View({ name }: { name: string }) {
    const event = useEventHandles();
    retained.push(
      event("open", () => {
        calls.push(name);
      }),
    );
    return null;
  }
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(() => {
      renderer = create(React.createElement(View, { name: "foo" }));
    });
    retained[0]();
    await act(() =>
      renderer!.update(React.createElement(View, { name: "bar" })),
    );
    retained[0]();
    assert(
      calls.join() === "foo,bar" && retained[0] === retained.at(-1),
      "a native event handle stays stable and invokes the latest committed callback",
    );
    await act(() => renderer!.unmount());
    renderer = undefined;
    retained[0]();
    assert(
      calls.join() === "foo,bar",
      "retained native callbacks become inert when the result view unmounts",
    );
    for (let i = 0; i < 30; i++) {
      await act(() => {
        renderer = create(React.createElement(View, { name: "baz" }));
      });
      await act(() => renderer!.unmount());
    }
    for (const callback of retained) callback();
    assert(
      calls.join() === "foo,bar",
      "repeated view replacement leaves no callable old handlers behind",
    );
    renderer = undefined;
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
