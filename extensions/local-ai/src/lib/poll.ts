export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  sleep: (ms: number) => Promise<void>;
}

export async function pollForText(
  read: () => Promise<string | undefined>,
  options: PollOptions,
): Promise<string | undefined> {
  const attempts = Math.floor(options.timeoutMs / options.intervalMs);
  for (let attempt = 0; attempt < attempts; attempt++) {
    await options.sleep(options.intervalMs);
    const text = await read();
    if (text) return text;
  }
  return undefined;
}
