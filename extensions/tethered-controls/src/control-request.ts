type ControlDependencies = {
  isRunning: () => Promise<boolean>;
  requestID: () => string;
  send: (url: string) => Promise<void>;
  readResponses: () => Promise<unknown>;
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
};

export async function requestControl(path: string, dependencies: ControlDependencies): Promise<string> {
  if (!(await dependencies.isRunning())) throw new Error("Open Tethered before using controls.");
  const url = new URL(`tethered://control${path}`);
  const request = dependencies.requestID();
  url.searchParams.set("request", request);
  await dependencies.send(url.toString());
  const deadline = dependencies.now() + 30000;
  while (dependencies.now() < deadline) {
    const responses = await dependencies.readResponses().catch(() => undefined);
    const result =
      typeof responses === "object" && responses !== null ? (responses as Record<string, unknown>)[request] : undefined;
    if (
      typeof result === "object" &&
      result !== null &&
      "request" in result &&
      result.request === request &&
      "success" in result &&
      typeof result.success === "boolean" &&
      "message" in result &&
      typeof result.message === "string"
    ) {
      if (!result.success) throw new Error(result.message);
      return result.message;
    }
    await dependencies.sleep(150);
  }
  throw new Error(
    "Tethered did not confirm the action. Update the app and check its settings before retrying; the action may have succeeded.",
  );
}
