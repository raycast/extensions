import { runControl } from "../native";
import {
  assertOperation,
  CompletionState,
  Operation,
  parseResponse,
} from "./response";

const OPERATIONS: Operation[] = [
  "status",
  "enable-default",
  "disable-default",
  "toggle-default",
];
// The native helper enforces its own work and cleanup deadlines; this only
// stops Raycast from waiting forever if the helper never answers.
const RESPONSE_TIMEOUT_MS = 35_000;
let statusReading: Promise<CompletionState> | undefined;

async function executeControl(operation: Operation): Promise<CompletionState> {
  if (!OPERATIONS.includes(operation))
    throw new Error("Unsupported Cotypist operation.");
  let timer: NodeJS.Timeout | undefined;
  let output: string;
  try {
    output = await Promise.race([
      runControl(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Cotypist's native controls did not respond in time. Check its setup and Accessibility permission before retrying.",
              ),
            ),
          RESPONSE_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cotypist's"))
      throw error;
    throw new Error(
      "Cotypist's native controls could not run. Check its setup and Accessibility permission before retrying.",
    );
  } finally {
    clearTimeout(timer);
  }
  return assertOperation(operation, parseResponse(output));
}

export async function control(operation: Operation): Promise<CompletionState> {
  if (operation !== "status") return executeControl(operation);
  // React can start the read-only mount effect more than once. Share only a
  // currently pending status read in this command process; mutations and
  // separate Raycast commands still use the native operation lock.
  statusReading ??= executeControl(operation).finally(() => {
    statusReading = undefined;
  });
  return statusReading;
}
