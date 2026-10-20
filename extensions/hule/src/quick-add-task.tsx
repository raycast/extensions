import { LaunchProps, Toast, open, openExtensionPreferences, showToast } from "@raycast/api";
import { createTask, getBundle, preferences, taskUrl } from "./api/client";
import type { AvailableBundle, List } from "./api/types";
import { writableLists } from "./hooks/useHule";

export type ListChoice =
  | { list: List }
  | { problem: "none" }
  | { problem: "missing"; wanted: string }
  | { problem: "ambiguous"; wanted: string; workspaces: string[] };

/** Case, outer spaces and the spacing around "/" never decide a match. */
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " / ");
}

/**
 * Pick the list Quick Add writes to. There is no server-side "inbox list" yet —
 * that setting belongs to the GTD work — so the choice lives in the extension.
 *
 * An empty preference means "my first list", as the preference says. A filled one
 * must name exactly one list, either as `List` or as `Workspace / List`: a typo or
 * a name two workspaces share is reported, never replaced by some other list — a
 * one-line command gives no chance to notice the task landed somewhere else.
 */
export function resolveList(
  bundle: Pick<AvailableBundle, "lists" | "folders" | "workspaces">,
  preferredName: string | undefined,
): ListChoice {
  const usable = writableLists(bundle);
  const wanted = preferredName?.trim() ?? "";
  if (!wanted) return usable[0] ? { list: usable[0] } : { problem: "none" };

  const workspaceName = (list: List) => bundle.workspaces.find((w) => w.id === list.workspaceId)?.name ?? "";
  const key = normalize(wanted);
  const matches = usable.filter((list) =>
    [list.name, `${workspaceName(list)} / ${list.name}`].some((form) => normalize(form) === key),
  );

  if (matches.length === 1) return { list: matches[0] };
  if (matches.length === 0) return { problem: "missing", wanted };
  return { problem: "ambiguous", wanted, workspaces: matches.map(workspaceName) };
}

function explain(choice: Exclude<ListChoice, { list: List }>): { title: string; message: string } {
  switch (choice.problem) {
    case "none":
      return { title: "No list to write to", message: "This account has no list yet — create one in Hule first." };
    case "missing":
      return {
        title: "Default List not found",
        message: `No list is named “${choice.wanted}”. Check Default List in the extension preferences.`,
      };
    case "ambiguous": {
      // The `Workspace / List` form only helps when the workspaces differ; two
      // same-named lists inside one workspace can only be told apart by renaming.
      const distinct = new Set(choice.workspaces).size === choice.workspaces.length;
      return {
        title: "Default List is ambiguous",
        message: distinct
          ? `Several lists are named “${choice.wanted}” (${choice.workspaces.join(", ")}). Set Default List to “${choice.workspaces[0]} / ${choice.wanted}” or similar.`
          : `Several lists are named “${choice.wanted}”. Rename one of them in Hule.`,
      };
    }
  }
}

export default async function Command(props: LaunchProps<{ arguments: { title: string } }>) {
  const title = props.arguments.title.trim();
  if (!title) {
    await showToast({ style: Toast.Style.Failure, title: "A task needs a title" });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task" });
  try {
    const choice = resolveList(await getBundle(), preferences().defaultList);

    if (!("list" in choice)) {
      const { title, message } = explain(choice);
      toast.style = Toast.Style.Failure;
      toast.title = title;
      toast.message = message;
      if (choice.problem !== "none") {
        toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
      }
      return;
    }

    const task = await createTask(choice.list.id, { title });
    toast.style = Toast.Style.Success;
    toast.title = `Added to ${choice.list.name}`;
    toast.message = task.title;
    toast.primaryAction = { title: "Open in Hule", onAction: () => open(taskUrl(task)) };
  } catch (cause) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not create the task";
    toast.message = cause instanceof Error ? cause.message : String(cause);
  }
}
