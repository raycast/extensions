// The `launchContext` wire contract for cross-command hand-offs into `add`. One
// definition keeps the producer and the consumer in sync — a new field can never
// drift between the two sides.

export interface ScheduleContext {
  name?: string;
  durationHours?: number;
  date?: string; // YYYY-MM-DD
}
