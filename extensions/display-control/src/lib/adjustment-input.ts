type Press = { target: string; direction: -1 | 1; baseStep: number; time: number; count: number };

export class PressAcceleration {
  private previous?: Press;

  nextStep(target: string, direction: -1 | 1, baseStep: number, time = performance.now()): number {
    const previous = this.previous;
    const consecutive =
      previous &&
      previous.target === target &&
      previous.direction === direction &&
      previous.baseStep === baseStep &&
      time >= previous.time &&
      time - previous.time <= 350;
    const count = consecutive ? Math.min(previous.count + 1, 10) : 1;
    this.previous = { target, direction, baseStep, time, count };
    const multiplier = count >= 10 ? 10 : count >= 6 ? 5 : count >= 3 ? 2 : 1;
    return Math.min(baseStep * multiplier, Math.max(baseStep, 10));
  }

  reset(): void {
    this.previous = undefined;
  }
}

export class CoalescedAdjustments {
  private pending = new Map<string, () => Promise<void>>();
  private running = false;
  private completion: Promise<void> = Promise.resolve();

  enqueue(target: string, apply: () => Promise<void>): Promise<void> {
    // A slow monitor needs only the latest repeat for each control, including its latest direction.
    this.pending.set(target, apply);
    if (!this.running) {
      this.running = true;
      this.completion = this.drain();
    }
    return this.completion;
  }

  clear(): void {
    this.pending.clear();
  }

  private async drain(): Promise<void> {
    try {
      while (this.pending.size) {
        const [target, apply] = this.pending.entries().next().value!;
        this.pending.delete(target);
        await apply();
      }
    } catch (error) {
      this.clear();
      throw error;
    } finally {
      this.running = false;
    }
  }
}
