// Allow the helper's 30-second recording completion wait, plus stopCapture
// and a possible second completion/recovery attempt on failure.
export const CONTROL_ACK_TIMEOUT_MS = 90_000;

type WaitClock = {
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
};

export async function waitFor<State>(
  read: () => Promise<State | undefined>,
  predicate: (state: State) => boolean,
  timeout = CONTROL_ACK_TIMEOUT_MS,
  clock: WaitClock = {
    now: Date.now,
    sleep: (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  },
): Promise<State> {
  const deadline = clock.now() + timeout;
  while (clock.now() < deadline) {
    const state = await read();
    if (state && predicate(state)) return state;
    await clock.sleep(100);
  }
  throw new Error("Meeting Capture did not acknowledge the command in time.");
}
