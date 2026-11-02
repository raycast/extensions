import { List, Icon, Color, Image } from "@raycast/api";
import { PullRequest } from "../github/types/pr";
import { PRExtraInfo } from "../github/types/ci";
import { getCIIcon, getCILabel } from "./utils/ci";

export function PRDetail({ pr, repoName, extraInfo }: { pr: PullRequest; repoName: string; extraInfo?: PRExtraInfo }) {
  const { reviewCounts, ci } = extraInfo ?? {};

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={pr.title} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Author"
            text={pr.user.login}
            icon={{ source: pr.user.avatar_url, mask: Image.Mask.Circle }}
          />
          <List.Item.Detail.Metadata.Label title="Repository" text={repoName} />
          <List.Item.Detail.Metadata.Label title="PR" text={`#${pr.number}`} />
          {pr.draft && (
            <List.Item.Detail.Metadata.Label
              title="Status"
              text="Draft"
              icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Approvals"
            text={reviewCounts ? String(reviewCounts.approved) : "…"}
            icon={
              reviewCounts && reviewCounts.approved > 0
                ? { source: Icon.Checkmark, tintColor: Color.Green }
                : { source: Icon.Minus, tintColor: Color.SecondaryText }
            }
          />
          <List.Item.Detail.Metadata.Label
            title="Changes Requested"
            text={reviewCounts ? String(reviewCounts.changesRequested) : "…"}
            icon={
              reviewCounts && reviewCounts.changesRequested > 0
                ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                : { source: Icon.Minus, tintColor: Color.SecondaryText }
            }
          />

          {ci && ci.status !== "unknown" && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="CI" text={getCILabel(ci)} icon={getCIIcon(ci.status)} />
              {ci.failingNames?.map((name, i) => (
                <List.Item.Detail.Metadata.Label
                  key={`${pr.number}-fail-${i}`}
                  title=""
                  text={name}
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                />
              ))}
            </>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Comments" text={String(pr.comments)} icon={Icon.Bubble} />
          <List.Item.Detail.Metadata.Label title="Updated" text={new Date(pr.updated_at).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Created" text={new Date(pr.created_at).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
