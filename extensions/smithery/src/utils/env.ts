import { buildSmitheryVersionArgs } from "../constants/commands";
import { getSmitheryExecutable, runSmitheryCommand } from "./smithery";

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";

const smitheryChecksInFlight = new Map<string, Promise<void>>();
const verifiedExecutables = new Set<string>();

export function getExecEnv(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...overrides,
    PATH: `${PATH_PREFIX}:${process.env.PATH ?? ""}`,
  };
}

export async function checkSmitheryOrThrow(): Promise<void> {
  const executable = getSmitheryExecutable();

  if (verifiedExecutables.has(executable)) {
    return;
  }

  const inFlight = smitheryChecksInFlight.get(executable);
  if (inFlight) {
    return inFlight;
  }

  const checkPromise = (async () => {
    try {
      await runSmitheryCommand(buildSmitheryVersionArgs(), {
        timeout: 10_000,
      });
      verifiedExecutables.add(executable);
    } catch {
      throw new Error(
        `Could not run Smithery executable \`${executable}\`. Install the Smithery CLI or update the "Smithery Executable" preference.`,
      );
    } finally {
      smitheryChecksInFlight.delete(executable);
    }
  })();

  smitheryChecksInFlight.set(executable, checkPromise);

  return checkPromise;
}
