import { Color, Icon, Action } from "@raycast/api";
import { PipelinesList } from "./pipelinesList";
import { PullRequestsList } from "./pullRequestsList";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ShowPipelinesActions(props: { repo: any }) {
  return (
    <Action.Push
      title="Show pipelines"
      target={<PipelinesList repo={props.repo} pageNumber={1} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ShowPullRequestsActions(props: { repo: any }) {
  return (
    <Action.Push
      title="Show pull requests"
      target={<PullRequestsList repo={props.repo} pageNumber={1} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GoesToNextPipelinePage({ setPageNumber, pageNumber }: { setPageNumber: any; pageNumber: number }) {
  return (
    <Action
      title="Goes to next page"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={() => setPageNumber(pageNumber + 1)}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GoesToPreviousPipelinePage({ setPageNumber, pageNumber }: { setPageNumber: any; pageNumber: number }) {
  return (
    <Action
      title="Goes to previous page"
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      onAction={() => setPageNumber(pageNumber - 1)}
    />
  );
}
