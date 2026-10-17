import { createSingleFlight } from "./single-flight";

export interface RefreshResult {
  errorMessage?: string;
}

export function createRefreshController(
  operation: () => Promise<RefreshResult>,
  showResult: (result: RefreshResult) => Promise<void>,
): (notify?: boolean) => Promise<void> {
  const run = createSingleFlight(operation);

  return async (notify = false) => {
    const result = await run();
    if (notify) await showResult(result);
  };
}
