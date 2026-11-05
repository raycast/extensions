import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  type Image,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { type PondProblem, type ProblemKind, problemCopy, problemOf } from "../api/problems";
import { DOWNLOAD_URL, LIBRARY_LINK, TOKEN_SETTINGS_LINK } from "../lib/links";

const ICONS = {
  "not-installed": Icon.Download,
  "not-running": Icon.Power,
  unauthorized: Icon.Key,
  outdated: Icon.ArrowUpCircle,
  misconfigured: Icon.Gear,
  failed: Icon.ExclamationMark,
} satisfies Record<ProblemKind, Image.ImageLike>;

function ProblemActions({ problem, onRetry }: { problem: PondProblem; onRetry?: () => void }) {
  const retry = onRetry ? (
    <Action
      title="Try Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRetry}
    />
  ) : null;
  switch (problem.kind) {
    case "not-installed":
      return (
        <>
          <Action.OpenInBrowser title="Get Pond" icon={Icon.Download} url={DOWNLOAD_URL} />
          {retry}
        </>
      );
    case "not-running":
      return (
        <>
          <Action
            title="Open Pond"
            icon={Icon.AppWindow}
            onAction={async () => {
              await open(LIBRARY_LINK);
              setTimeout(() => onRetry?.(), 2000);
            }}
          />
          {retry}
        </>
      );
    case "unauthorized":
      return (
        <>
          <Action.Open title="Copy Token in Pond" icon={Icon.Key} target={TOKEN_SETTINGS_LINK} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {retry}
        </>
      );
    case "outdated":
      return (
        <>
          <Action.OpenInBrowser title="Update Pond" icon={Icon.ArrowUpCircle} url={DOWNLOAD_URL} />
          {retry}
        </>
      );
    case "misconfigured":
      return <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;
    case "failed":
      return (
        <>
          {retry}
          <Action.Open title="Open Pond" icon={Icon.AppWindow} target={LIBRARY_LINK} />
        </>
      );
  }
}

export function ProblemView({ error, onRetry, grid }: { error: Error; onRetry?: () => void; grid?: boolean }) {
  const problem = problemOf(error);
  const copy = problemCopy(problem);
  const actions = (
    <ActionPanel>
      <ProblemActions problem={problem} onRetry={onRetry} />
    </ActionPanel>
  );
  return grid ? (
    <Grid.EmptyView icon={ICONS[problem.kind]} title={copy.title} description={copy.description} actions={actions} />
  ) : (
    <List.EmptyView icon={ICONS[problem.kind]} title={copy.title} description={copy.description} actions={actions} />
  );
}

/** Turns a running toast into a failure with the one action that fixes the problem. */
export function failToast(toast: Toast, error: Error, title: string): void {
  const problem = problemOf(error);
  const copy = problemCopy(problem);
  toast.style = Toast.Style.Failure;
  toast.title = problem.kind === "failed" ? title : copy.title;
  toast.message = copy.description;
  const action = toastAction(problem.kind);
  if (action) toast.primaryAction = action;
}

function toastAction(kind: ProblemKind): Toast.ActionOptions | undefined {
  switch (kind) {
    case "not-installed":
    case "outdated":
      return { title: kind === "outdated" ? "Update Pond" : "Get Pond", onAction: () => open(DOWNLOAD_URL) };
    case "not-running":
    case "failed":
      return { title: "Open Pond", onAction: () => open(LIBRARY_LINK) };
    case "unauthorized":
      return { title: "Copy Token in Pond", onAction: () => open(TOKEN_SETTINGS_LINK) };
    case "misconfigured":
      return { title: "Open Extension Preferences", onAction: openExtensionPreferences };
  }
}

export async function showFailure(error: Error, title: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Failure, title });
  failToast(toast, error, title);
}
