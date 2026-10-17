/** Minimum time between screen updates for rapid input that is not a recognized hold. */
export const UPDATE_INTERVAL_MS = 100;

/** Repeats of the same key closer together than this are treated as the key being held down. */
export const HOLD_GAP_MS = 120;

export interface HoldOptions<T> {
  /** Identifies the key; only repeats of the same key count as holding it. */
  key: string;
  /** While held, only render when this says the value crossed a boundary worth showing. */
  isBoundary: (shown: T, next: T) => boolean;
}

/**
 * Decides when a rapidly changing value is rendered.
 *
 * Held arrow keys repeat every ~30 ms, faster than Raycast can load each new
 * calendar image, so rendering every change makes updates pile up and the view
 * keeps moving after the key is released. The value itself always changes
 * immediately, so the final position is exact; only intermediate frames are
 * skipped:
 *
 * - While a key is held, a frame is rendered only at boundaries chosen by the
 *   caller (e.g. when the month changes), and the final value is rendered once
 *   the key is released.
 * - Any other burst of changes renders at most once per `UPDATE_INTERVAL_MS`.
 * - A change after a pause renders right away, so single presses feel unchanged.
 */
export class UpdateScheduler<T> {
  private latest: T;
  private shown: T;
  private lastRender = Number.NEGATIVE_INFINITY;
  private lastInput?: { key?: string; time: number };
  private throttleTimer?: ReturnType<typeof setTimeout>;
  private settleTimer?: ReturnType<typeof setTimeout>;

  constructor(
    initial: T,
    private readonly render: (value: T) => void,
  ) {
    this.latest = initial;
    this.shown = initial;
  }

  update(next: (current: T) => T, hold?: HoldOptions<T>) {
    this.latest = next(this.latest);

    const now = Date.now();
    const isHolding = hold !== undefined && this.lastInput?.key === hold.key && now - this.lastInput.time < HOLD_GAP_MS;
    this.lastInput = { key: hold?.key, time: now };

    if (isHolding && !hold.isBoundary(this.shown, this.latest)) {
      // Show the exact final position once the key is released.
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => this.flush(), HOLD_GAP_MS);
      return;
    }

    if (this.throttleTimer) return;
    const wait = UPDATE_INTERVAL_MS - (now - this.lastRender);
    if (wait <= 0) {
      this.flush();
    } else {
      this.throttleTimer = setTimeout(() => this.flush(), wait);
    }
  }

  /**
   * Shows any pending change right away and returns the latest value. Use it
   * when confirming a selection, so keys pressed just before Enter still count.
   */
  settle(): T {
    if (this.shown !== this.latest) this.flush();
    return this.latest;
  }

  dispose() {
    clearTimeout(this.throttleTimer);
    clearTimeout(this.settleTimer);
  }

  private flush() {
    clearTimeout(this.throttleTimer);
    clearTimeout(this.settleTimer);
    this.throttleTimer = undefined;
    this.settleTimer = undefined;
    this.lastRender = Date.now();
    this.shown = this.latest;
    this.render(this.latest);
  }
}
