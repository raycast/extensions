import { ActionPanel, PushAction, Color, Icon } from "@raycast/api";
import { PipelinesList } from "./pipelinesList";
import { PullRequestsList } from "./pullRequestsList";

export function ShowPipelinesActions(props: { repo: any }): JSX.Element {
  return (
    <PushAction
      title="Show pipelines"
      target={<PipelinesList repo={props.repo} pageNumber={1} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
    />
  );
}

export function ShowPullRequestsActions(props: { repo: any }): JSX.Element {
  return (
    <PushAction
      title="Show pull requests"
      target={<PullRequestsList repo={props.repo} pageNumber={1} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}

export function GoesToNextPipelinePage({
  setPageNumber,
  pageNumber,
}: {
  setPageNumber: any;
  pageNumber: number;
}): JSX.Element {
  return (
    <ActionPanel.Item
      title="Goes to next page"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => setPageNumber(pageNumber + 1)}
    />
  );
}

export function GoesToPreviousPipelinePage({
  setPageNumber,
  pageNumber,
}: {
  setPageNumber: any;
  pageNumber: number;
}): JSX.Element {
  return (
    <ActionPanel.Item
      title="Goes to previous page"
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      onAction={() => setPageNumber(pageNumber - 1)}
    />
  );
}
