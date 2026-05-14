import { Color, Icon, Action } from "@raycast/api";
import { PipelinesList } from "./pipelinesList";
import { PullRequestsList } from "./pullRequestsList";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ShowPipelinesActions(props: { repo: any }) {
  return (
    <Action.Push
      title="Show Pipelines"
      target={<PipelinesList repo={props.repo} pageNumber={1} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "p" },
        Windows: { modifiers: ["ctrl", "shift"], key: "p" },
      }}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ShowPullRequestsActions(props: { repo: any }) {
  return (
    <Action.Push
      title="Show Pull Requests"
      target={<PullRequestsList repo={props.repo} pageNumber={1} />}
      icon={{ source: Icon.List, tintColor: Color.PrimaryText }}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "r" },
        Windows: { modifiers: ["ctrl"], key: "r" },
      }}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GoesToNextPipelinePage({ setPageNumber, pageNumber }: { setPageNumber: any; pageNumber: number }) {
  return (
    <Action
      title="Goes to Next Page"
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "n" },
        Windows: { modifiers: ["ctrl"], key: "n" },
      }}
      onAction={() => setPageNumber(pageNumber + 1)}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GoesToPreviousPipelinePage({ setPageNumber, pageNumber }: { setPageNumber: any; pageNumber: number }) {
  return (
    <Action
      title="Goes to Previous Page"
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "p" },
        Windows: { modifiers: ["ctrl"], key: "p" },
      }}
      onAction={() => setPageNumber(pageNumber - 1)}
    />
  );
}
