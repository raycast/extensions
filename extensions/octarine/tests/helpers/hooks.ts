export class HookRuntime {
  private refSlots: unknown[] = [];
  private callbackSlots: Array<{ callback: unknown; deps?: readonly unknown[] }> = [];
  private effectSlots: Array<readonly unknown[] | undefined> = [];
  private queuedEffects: Array<() => void> = [];
  private hookIndex = 0;
  private effectIndex = 0;

  beginRender(): void {
    this.hookIndex = 0;
    this.effectIndex = 0;
    this.queuedEffects = [];
  }

  useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void {
    const index = this.effectIndex++;
    const previousDeps = this.effectSlots[index];

    if (!haveDepsChanged(previousDeps, deps)) {
      return;
    }

    this.effectSlots[index] = deps;
    this.queuedEffects.push(() => {
      effect();
    });
  }

  useRef<T>(initialValue: T): { current: T } {
    const index = this.hookIndex++;

    if (this.refSlots[index] === undefined) {
      this.refSlots[index] = { current: initialValue };
    }

    return this.refSlots[index] as { current: T };
  }

  useCallback<T>(callback: T, deps?: readonly unknown[]): T {
    const index = this.hookIndex++;
    const slot = this.callbackSlots[index];

    if (slot && !haveDepsChanged(slot.deps, deps)) {
      return slot.callback as T;
    }

    this.callbackSlots[index] = { callback, deps };
    return callback;
  }

  flushEffects(): void {
    const effects = [...this.queuedEffects];
    this.queuedEffects = [];

    for (const effect of effects) {
      effect();
    }
  }
}

export function haveDepsChanged(
  previousDeps: readonly unknown[] | undefined,
  nextDeps: readonly unknown[] | undefined,
): boolean {
  if (previousDeps === undefined || nextDeps === undefined) {
    return true;
  }

  if (previousDeps.length !== nextDeps.length) {
    return true;
  }

  return nextDeps.some((dependency, index) => !Object.is(dependency, previousDeps[index]));
}
