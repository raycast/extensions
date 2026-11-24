import { LocalStorage } from "@raycast/api";
import { Candidate } from "./candidates";

// A tool's `confirmation` and its default export only share the input, and each resolves the
// service by name on its own - storage is how the tool learns which exact service was approved.
function storageKey(tool: string, input: unknown) {
  return `confirmed-candidate:${tool}:${JSON.stringify(input)}`;
}

function identity(candidate: Candidate) {
  return `${candidate.instanceKey}:${candidate.id}`;
}

export async function rememberConfirmedCandidate(tool: string, input: unknown, candidate: Candidate) {
  await LocalStorage.setItem(storageKey(tool, input), identity(candidate));
}

/**
 * Throws, before anything is sent to Dokploy, if this input now resolves to a different service
 * than the one its confirmation showed - e.g. it was deleted and recreated under the same name
 * while the prompt was open.
 */
export async function assertConfirmedCandidate(tool: string, input: unknown, candidate: Candidate) {
  const key = storageKey(tool, input);
  const confirmed = await LocalStorage.getItem<string>(key);
  await LocalStorage.removeItem(key);
  if (confirmed !== undefined && confirmed !== identity(candidate)) {
    throw new Error(
      `"${candidate.name}" now refers to a different service than the one you confirmed, so nothing was changed. Ask again to confirm the current one.`,
    );
  }
}
