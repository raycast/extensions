import { closeMainWindow, showHUD } from "@raycast/api";

export async function waitUntil<T>(
  promise: Promise<T> | (() => Promise<T>),
  options?: { timeout?: number; timeoutMessage: string },
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(async () => {
      reject(new Error(options?.timeoutMessage ?? "Timed out"));
    }, options?.timeout ?? 6000);
  });

  const unwrappedPromise = promise instanceof Function ? promise() : promise;
  return await Promise.race([unwrappedPromise, timeout]);
}

export async function run(fn: () => Promise<string>) {
  try {
    await closeMainWindow({ clearRootSearch: true });
    const response = await fn();
    await showHUD(response);
  } catch (error) {
    await showFailureHUD(error instanceof Error ? error.message : "Something went wrong");
  }
}

async function showFailureHUD(title: string, error?: unknown) {
  await showHUD(`❌ ${title}`);
  console.error(title, error);
}

export const rangeValidator = (min: number, max: number) => (value: string | undefined) => {
  if (value === undefined) {
    return "The item is required";
  }

  const parsedValue = parseInt(value);
  if (isNaN(parsedValue)) {
    return "The item must be a number";
  }

  if (parsedValue < min || parsedValue > max) {
    return `The item must be between ${min} and ${max}`;
  }

  return undefined;
};
