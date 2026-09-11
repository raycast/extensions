import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandNavigation } from "../hooks/use-command-navigation";

const pop = vi.fn();
const push = vi.fn();
const popToRoot = vi.hoisted(() => vi.fn());
const onPopCallbacks: Array<() => void> = [];

vi.mock("@raycast/api", () => ({
  useNavigation: () => ({ push, pop }),
  popToRoot,
}));

describe("useCommandNavigation", () => {
  it("tracks pushed views and pops back to the command root", () => {
    pop.mockClear();
    push.mockClear();
    onPopCallbacks.length = 0;

    push.mockImplementation((_component, onPop) => {
      onPopCallbacks.push(onPop);
    });

    pop.mockImplementation(() => {
      const onPop = onPopCallbacks.pop();
      onPop?.();
    });

    const { result } = renderHook(() => useCommandNavigation());

    act(() => {
      result.current.pushView(<div />);
      result.current.pushView(<div />);
    });

    expect(result.current.depthRef.current).toBe(2);

    act(() => {
      result.current.popToRootView();
    });

    expect(popToRoot).toHaveBeenCalledTimes(1);
    expect(result.current.depthRef.current).toBe(0);
  });
});
