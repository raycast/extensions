import { getPreferenceValues, open, showHUD, showToast, Toast } from "@raycast/api";
import { normalizeLocalPath } from "./path-input";

export type Target = Preferences["pathTarget"];

export { normalizeLocalPath } from "./path-input";

export function preferredPathTarget(): Target {
  return getPreferenceValues<Preferences>().pathTarget;
}

function link(verb: string, fields: ReadonlyArray<readonly [string, string]> = []): string {
  const url = new URL(`swiftsalamander://v1/${verb}`);
  for (const [key, value] of fields) url.searchParams.append(key, value);
  return url.toString();
}

export async function runCommand(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Swift Salamander",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function send(
  verb: string,
  fields: ReadonlyArray<readonly [string, string]> = [],
): Promise<void> {
  await open(link(verb, fields));
  await showHUD("Sent to Swift Salamander");
}

export function openFields(paths: string[], target: Target = preferredPathTarget()) {
  return [
    ...paths.map((path) => ["path", normalizeLocalPath(path)] as const),
    ["target", target] as const,
  ];
}
