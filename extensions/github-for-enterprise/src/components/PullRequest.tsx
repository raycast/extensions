import { ActionPanel, Color, List, Action, Clipboard, Image } from "@raycast/api";
import { format } from "timeago.js";
import AddPRReview from "./AddPRReview";
import ClosePR from "./ClosePR";
import MergePR from "./MergePR";
import PullRequestDetail from "./PullRequestDetail";
import ReopenPR from "./ReopenPR";

export type PullRequestOwnProps = {
  author: {
    avatarUrl: string;
  };
  body: string;
  createdAt: string;
  id: string;
  number: number;
  repository: {
    nameWithOwner: string;
    mergeCommitAllowed: boolean;
    rebaseMergeAllowed: boolean;
    squashMergeAllowed: boolean;
  };
  state: string;
  title: string;
  url: string;
};

export default function PullRequest(props: PullRequestOwnProps) {
  const { author, createdAt, id, number, repository, state, title, url } = props;

  return (
    <List.Item
      key={id}
      title={title}
      subtitle={`#${number} in ${repository.nameWithOwner}`}
      icon={{
        source: state === "MERGED" ? "pull-request-merge.png" : "pull-request.png",
        tintColor: state === "OPEN" ? Color.Green : state === "CLOSED" ? Color.Red : Color.Purple,
      }}
      actions={
        <ActionPanel title={`#${number} in ${repository.nameWithOwner}`}>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              target={<PullRequestDetail {...props} />}
              icon={{
                source: "sidebar-right-16",
                tintColor: Color.PrimaryText,
              }}
            />
            <Action.OpenInBrowser url={url} />
            {state === "OPEN" && (
              <Action.Push
                title="Add Review"
                target={<AddPRReview id={id} title={title} />}
                icon={{
                  source: "doc-plaintext-16",
                }}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "r",
                }}
              />
            )}
          </ActionPanel.Section>
          {state === "OPEN" && (
            <ActionPanel.Section>
              {repository.mergeCommitAllowed && (
                <MergePR
                  id={id}
                  number={number}
                  title="Create Merge Commit"
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "enter",
                  }}
                />
              )}
              {repository.squashMergeAllowed && (
                <MergePR id={id} method="SQUASH" number={number} title="Squash and Merge" />
              )}
              {repository.rebaseMergeAllowed && (
                <MergePR id={id} method="REBASE" number={number} title="Rebase and Merge" />
              )}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              title="Copy Pull Request Number"
              icon={{
                source: "doc-on-clipboard-16",
                tintColor: Color.PrimaryText,
              }}
              onAction={() => Clipboard.copy(`${number}`)}
            />
            <Action
              title="Copy Pull Request URL"
              icon={{
                source: "doc-on-clipboard-16",
                tintColor: Color.PrimaryText,
              }}
              onAction={() => Clipboard.copy(url)}
            />
          </ActionPanel.Section>
          {state !== "MERGED" && (
            <ActionPanel.Section>
              {state === "OPEN" && <ClosePR id={id} number={number} />}
              {state === "CLOSED" && <ReopenPR id={id} number={number} />}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
      accessories={[
        {
          text: format(createdAt),

          icon: {
            source: author.avatarUrl,
            mask: Image.Mask.Circle,
          },
        },
      ]}
    />
  );
}
