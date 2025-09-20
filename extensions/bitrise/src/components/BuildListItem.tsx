import { List, Color, Icon, ActionPanel, Action, Image } from "@raycast/api";
import { ReactNode } from "react";
import { Build, BuildStatus } from "../api/types";

export function BuildListItem(props: { build: Build; displayRepoTitle: boolean }) {
  return (
    <List.Item
      id={props.build.slug}
      icon={buildIcon(props.build.status)}
      title={buildTitle(props.build)}
      subtitle={buildSubtitle(props.build)}
      accessories={buildAccessories(props.build, props.displayRepoTitle)}
      actions={buildActions(props.build)}
    />
  );
}

function buildIcon(buildStatus: BuildStatus): Image.ImageLike {
  let icon: Image.ImageLike = Icon.Circle;
  switch (buildStatus) {
    case BuildStatus.InProgress:
      icon = {
        source: "build-inprogress.svg",
        tintColor: Color.Purple,
      };
      break;
    case BuildStatus.Successful:
      icon = {
        source: "build-successful.svg",
        tintColor: Color.Green,
      };
      break;
    case BuildStatus.Failed:
      icon = {
        source: "build-failed.svg",
        tintColor: Color.Red,
      };
      break;
    case BuildStatus.AbortedWithFailure:
    case BuildStatus.AbortedWithSuccess:
      icon = {
        source: "build-aborted.svg",
        tintColor: Color.Yellow,
      };
      break;
  }
  return icon;
}

function buildTitle(build: Build): string {
  if (build.commit_message) {
    return build.commit_message;
  } else {
    return `Build #${build.build_number}`;
  }
}

function buildSubtitle(build: Build): string | undefined {
  if (build.abort_reason != null) {
    return build.abort_reason;
  }
}

function buildAccessories(build: Build, displayRepoTitle: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (displayRepoTitle) {
    accessories.push({
      icon: build.repository?.avatar_url ?? Icon.Box,
      text: build.repository?.title,
    });
  }

  accessories.push({
    text: build.triggered_workflow,
    icon: {
      source: "workflow.svg",
      tintColor: Color.SecondaryText,
    },
  });

  if (build.tag != null && build.tag != "") {
    accessories.push({ text: build.tag, icon: Icon.Tag });
  }

  if (build.pull_request_id != null && build.pull_request_id != 0) {
    accessories.push({
      text: build.pull_request_id.toString(),
      icon: {
        source: "pr.svg",
        tintColor: Color.SecondaryText,
      },
    });
  }

  accessories.push({
    date: new Date(build.triggered_at),
  });

  return accessories;
}

function buildActions(build: Build): ReactNode {
  return (
    <ActionPanel title={`Build #${build.build_number}`}>
      <Action.OpenInBrowser url={buildURL(build)} />
      {build.pull_request_view_url && (
        <Action.OpenInBrowser title="Open PR in Browser" url={build.pull_request_view_url} />
      )}
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Build URL" content={buildURL(build)} />
        {build.pull_request_view_url && (
          <Action.CopyToClipboard title="Copy PR URL" content={build.pull_request_view_url} />
        )}
        <Action.CopyToClipboard title="Copy Build Number" content={build.build_number} />
        <Action.CopyToClipboard title="Copy workflow ID" content={build.triggered_workflow} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function buildURL(build: Build): string {
  return `https://app.bitrise.io/build/${build.slug}`;
}
