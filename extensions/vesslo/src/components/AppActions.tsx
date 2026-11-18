import { Action, ActionPanel, Icon } from "@raycast/api";
import { VessloApp } from "../types";
import { VessloDataState } from "../utils/data-state";
import { resolveAppActions } from "../utils/action-policy";
import { openInVesslo, performAppAction } from "../utils/actions";
import { ReloadDataAction } from "./DataStateNotice";
import { HomebrewRequestReview } from "./HomebrewRequestReview";

export function AppActions({
  app,
  state,
  reviewOnly = false,
  onRefresh,
}: {
  app: VessloApp;
  state: VessloDataState;
  reviewOnly?: boolean;
  onRefresh?: () => unknown | Promise<unknown>;
}) {
  const policy = resolveAppActions(app, state);
  return (
    <>
      {!reviewOnly && policy.update.kind !== "none" && (
        <ActionPanel.Section
          title={policy.update.kind === "review" ? "Review Required" : "Update"}
        >
          {policy.update.kind === "homebrewReview" && state.data ? (
            <Action.Push
              title="Review Homebrew Update in Vesslo"
              icon={Icon.CheckList}
              target={<HomebrewRequestReview data={state.data} apps={[app]} />}
            />
          ) : policy.update.kind === "handoff" ||
            policy.update.kind === "openAppStore" ? (
            <Action
              title={
                policy.update.kind === "handoff"
                  ? "Update in Vesslo"
                  : "Open in App Store"
              }
              icon={Icon.Download}
              onAction={() => performAppAction(app, "update")}
            />
          ) : (
            <Action
              title={
                app.primaryActionKind === "refreshRequired"
                  ? "Review Update Source in Vesslo"
                  : "Review in Vesslo"
              }
              icon={Icon.MagnifyingGlass}
              onAction={() => openInVesslo(policy.navigationBundleId)}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="App">
        {reviewOnly && (
          <Action
            title="Open in Vesslo"
            icon={Icon.Link}
            onAction={() => openInVesslo(policy.navigationBundleId)}
          />
        )}
        {!reviewOnly && policy.canOpenApp && (
          <Action
            title="Open App"
            icon={Icon.AppWindow}
            onAction={() => performAppAction(app, "open")}
          />
        )}
        {policy.canShowInFinder && (
          <Action
            title="Show in Finder"
            icon={Icon.Finder}
            onAction={() => performAppAction(app, "finder")}
          />
        )}
        {!reviewOnly && (
          <Action
            title="Open in Vesslo"
            icon={Icon.Link}
            onAction={() => openInVesslo(policy.navigationBundleId)}
          />
        )}
        {app.bundleId && (
          <Action.CopyToClipboard
            title="Copy Bundle ID"
            content={app.bundleId}
          />
        )}
      </ActionPanel.Section>
      {onRefresh && (
        <ActionPanel.Section title="Vesslo Data">
          <ReloadDataAction refresh={onRefresh} />
        </ActionPanel.Section>
      )}
    </>
  );
}
