import { Toast, showToast } from "@raycast/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { effects, toastRef } = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>,
  toastRef: { current: undefined as unknown },
}));

vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => effects.push(effect),
  useRef: () => toastRef,
}));

import { useLoadingToast } from "@commands/search-attachments/hooks/use-loading-toast";

function render(isLoading: boolean): () => void {
  useLoadingToast({ isLoading, title: "Scanning attachments…" });
  const effect = effects.pop();
  if (!effect) throw new Error("Missing loading effect");
  return effect() as () => void;
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  effects.length = 0;
  toastRef.current = undefined;
});

describe("useLoadingToast", () => {
  it("does not show a toast while idle", async () => {
    render(false);
    await flush();

    expect(showToast).not.toHaveBeenCalled();
  });

  it("hides the active toast once when loading ends", async () => {
    const hide = vi.fn(async () => undefined);
    const toast = { hide } as unknown as Toast;
    vi.mocked(showToast).mockResolvedValue(toast);

    const cleanup = render(true);
    await flush();
    expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Animated, title: "Scanning attachments…" });

    cleanup();
    render(false);
    await flush();

    expect(hide).toHaveBeenCalledOnce();
    expect(toastRef.current).toBeUndefined();
  });

  it("hides a late toast after the effect is disposed", async () => {
    const hide = vi.fn(async () => undefined);
    const toast = { hide } as unknown as Toast;
    let resolve!: (toast: Toast) => void;
    vi.mocked(showToast).mockReturnValue(
      new Promise<Toast>((done) => {
        resolve = done;
      }),
    );

    const cleanup = render(true);
    cleanup();
    resolve(toast);
    await flush();

    expect(hide).toHaveBeenCalledOnce();
    expect(toastRef.current).toBeUndefined();
  });
});
