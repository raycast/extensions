import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { VessloApp, VessloData } from "../types";
import { requestHomebrewReview } from "../utils/actions";
import { countLabel, displayText, markdownText } from "../utils/display-format";
import { homebrewReviewSelectionReason } from "../utils/handoff-execution";
import { HandoffRequestStatus } from "./HandoffRequestStatus";

/** Keeps the original selection immutable while the executor rereads the producer. */
export function HomebrewRequestReview({
  data,
  apps,
}: {
  data: VessloData;
  apps: readonly VessloApp[];
}) {
  const { push } = useNavigation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reason = homebrewReviewSelectionReason(data, apps);
  const send = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await requestHomebrewReview(data, apps);
      if (result.kind === "opened") {
        setError(null);
        push(<HandoffRequestStatus request={result.request} />);
      } else setError(result.reason);
    } catch {
      setError(
        "The review could not be opened. Return to the list and check Vesslo before trying again.",
      );
    } finally {
      setPending(false);
    }
  };
  const actions = (
    <ActionPanel>
      {!reason && !error && !pending && (
        <Action
          title="Open Review in Vesslo"
          icon={Icon.AppWindow}
          onAction={send}
        />
      )}
    </ActionPanel>
  );
  return (
    <List
      isLoading={pending}
      isShowingDetail
      navigationTitle="Review Selected Homebrew Apps"
      searchBarPlaceholder="Review exact selected targets…"
    >
      <List.Item
        id="homebrew-request-summary"
        icon={reason || error ? Icon.Warning : Icon.CheckList}
        title={
          error || reason
            ? "Selection Needs Review"
            : `${countLabel(apps.length)} selected`
        }
        subtitle={displayText(
          error ??
            reason ??
            "Vesslo will ask for confirmation before updating.",
        )}
        detail={
          <List.Item.Detail
            markdown={
              error || reason
                ? `## Request not sent\n\n${markdownText(error ?? reason)}\n\nGo back, reload the export, and select the targets again.`
                : "## Review in Vesslo\n\nOnly these Homebrew targets will be requested. Vesslo checks the current apps and asks for confirmation before updating.\n\nOpening the review is not proof of acceptance or completion. The next view follows Vesslo’s request receipt."
            }
          />
        }
        actions={actions}
      />
      {apps.map((app) => (
        <List.Item
          key={app.id}
          id={app.id}
          icon={Icon.AppWindow}
          title={displayText(app.name)}
          subtitle={`${displayText(app.version)} → ${displayText(app.targetVersion)}`}
          detail={
            <List.Item.Detail
              markdown={`## ${markdownText(app.name)}\n\n- Installed: ${markdownText(app.version)}\n- Target: ${markdownText(app.targetVersion)}\n- Cask: ${markdownText(app.homebrewCask)}\n- Bundle ID: ${markdownText(app.bundleId)}\n- Path: ${markdownText(app.path)}`}
            />
          }
          actions={actions}
        />
      ))}
    </List>
  );
}
