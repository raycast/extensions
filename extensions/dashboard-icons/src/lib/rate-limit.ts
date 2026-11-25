/**
 * Sliding-window request budget. The Dashboard Icons MCP server allows 30 tool calls per minute per IP;
 * staying below that locally avoids sending requests the server would reject anyway.
 */
export class RequestBudget {
  private timestamps: number[] = [];

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a request and returns true, or returns false when the budget is used up. */
  take(): boolean {
    const now = this.now();
    this.timestamps = this.timestamps.filter((time) => now - time < this.windowMs);
    if (this.timestamps.length >= this.limit) return false;
    this.timestamps.push(now);
    return true;
  }
}
