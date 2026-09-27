import path from "path";
import { LaunchProps, Toast, getPreferenceValues, open, showInFinder, showToast } from "@raycast/api";
import { QuickStyle, getSelection, planQuickCopies, runCopies } from "./lib/duplicate";

type Preferences = {
  defaultCopies: string;
  namingStyle: QuickStyle;
  revealInFinder: boolean;
};

type Arguments = {
  copies?: string;
};

const MAX_COPIES = 500;

/** Parses a copy count, preferring the argument and falling back to the preference. */
function resolveCopies(argument: string | undefined, preference: string): number {
  const raw = (argument ?? "").trim() || (preference ?? "").trim() || "1";
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`"${raw}" is not a whole number of copies`);
  }
  if (parsed > MAX_COPIES) {
    throw new Error(`Refusing to make more than ${MAX_COPIES} copies at once`);
  }

  return parsed;
}

export default async function QuickDuplicate(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();

  let copies: number;
  try {
    copies = resolveCopies(props.arguments?.copies, preferences.defaultCopies);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid number of copies",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const sources = await getSelection();
  if (sources.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing selected",
      message: "Select one or more items in Finder, then run the command again",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: copies === 1 ? "Duplicating…" : `Making ${copies} copies…`,
  });

  try {
    const plan = await planQuickCopies(sources, copies, preferences.namingStyle);
    const outcome = await runCopies(plan, "unique");

    if (outcome.created.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing was duplicated";
      toast.message = outcome.failed[0]?.message ?? "Every copy was skipped";
      return;
    }

    const names = outcome.created.map((target) => path.basename(target));
    toast.style = outcome.failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = outcome.created.length === 1 ? `Created ${names[0]}` : `Created ${outcome.created.length} copies`;
    toast.message =
      outcome.failed.length > 0
        ? `${outcome.failed.length} failed: ${outcome.failed[0].message}`
        : names.slice(0, 3).join(", ") + (names.length > 3 ? `, +${names.length - 3} more` : "");

    toast.primaryAction = {
      title: "Show in Finder",
      shortcut: {
        macOS: { modifiers: ["cmd", "shift"], key: "f" },
        Windows: { modifiers: ["ctrl", "shift"], key: "f" },
      },
      onAction: () => showInFinder(outcome.created[0]),
    };
    toast.secondaryAction = {
      title: "Open Copy",
      shortcut: {
        macOS: { modifiers: ["cmd", "shift"], key: "o" },
        Windows: { modifiers: ["ctrl", "shift"], key: "o" },
      },
      onAction: () => open(outcome.created[0]),
    };

    if (preferences.revealInFinder) {
      await showInFinder(outcome.created[0]);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not duplicate";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
