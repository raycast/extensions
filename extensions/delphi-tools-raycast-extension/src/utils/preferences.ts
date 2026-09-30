import { getPreferenceValues } from "@raycast/api";
import { tmpdir } from "node:os";
import path from "node:path";

const DEFAULT_CLI_PATH = "delphitools";
const DEFAULT_DEBOUNCE_DELAY = 250;
const OUTPUT_NAMESPACE = "delphitools-raycast-extension";

function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getDelphitoolsCliPath(): string {
  return getPreferences().cliPath?.trim() || DEFAULT_CLI_PATH;
}

export function getDefaultOutputRoot(): string {
  const configuredDirectory = getPreferences().defaultOutputDirectory?.trim();
  const root = configuredDirectory || tmpdir();

  return path.join(root, OUTPUT_NAMESPACE);
}

export function getCliDebounceDelay(): number {
  const value = Number(getPreferences().cliDebounceDelay);

  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_DEBOUNCE_DELAY;
  }

  return value;
}
