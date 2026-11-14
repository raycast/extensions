import { Toast, showToast } from "@raycast/api";

/** A form pick that has to belong to the selected workspace. `options` is undefined while it loads. */
export interface WorkspacePick<K extends string> {
  field: K;
  label: string;
  value: string;
  options: string[] | undefined;
}

/**
 * Checks workspace-scoped picks before submitting, so a form never quietly drops a choice and
 * files something the user didn't ask for. Returns false (after telling the user why) when a
 * list is still loading or a pick isn't in the workspace; invalid picks are cleared so the
 * user can choose again.
 */
export async function verifyPicks<K extends string>(
  picks: WorkspacePick<K>[],
  workspaceName: string,
  clear: (field: K) => void,
): Promise<boolean> {
  const chosen = picks.filter((p) => p.value);
  const loading = chosen.filter((p) => !p.options);
  if (loading.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Still loading ${loading.map((p) => p.label).join(" and ")}`,
      message: "Try again in a moment.",
    });
    return false;
  }

  const invalid = chosen.filter((p) => !p.options!.includes(p.value));
  if (invalid.length) {
    invalid.forEach((p) => clear(p.field));
    await showToast({
      style: Toast.Style.Failure,
      title: `Pick the ${invalid.map((p) => p.label).join(" and ")} again`,
      message: `The previous choice isn't in ${workspaceName}.`,
    });
    return false;
  }
  return true;
}
