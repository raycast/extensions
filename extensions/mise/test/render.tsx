import type { ReactElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

export function flush(run?: () => unknown): Promise<void> {
  return act(async () => {
    await run?.();
  });
}

export async function render(element: ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await flush(() => {
    renderer = create(element);
  });
  await flush();
  if (!renderer) throw new Error("render produced no tree");
  return renderer;
}
