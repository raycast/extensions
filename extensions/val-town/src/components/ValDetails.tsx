import { Color, List } from "@raycast/api";
import { Val } from "../types";
import { useVal } from "../hooks/useVal";
import { formatDistance } from "date-fns";
import { wrapCode } from "../helpers";

export const ValDetails = ({ valId }: { valId: Val["id"] }) => {
  const { val, isLoading } = useVal(valId);
  const {
    readme,
    code,
    name,
    privacy,
    public: p,
    author,
    version,
    likeCount,
    referenceCount,
    runStartAt,
    runEndAt,
  } = val || {};

  //   if the code is too large it will degrade performance, so truncate it and leave a message
  const codeMaybeTruncated =
    wrapCode(code?.substring(0, 3000)) +
    (code?.length && code?.length > 3000
      ? `\n\nCode truncated. [View on Val Town](https://www.val.town/${author?.username.replace("@", "")}.${name})`
      : "");

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={(readme ? readme + "\n\n" : "") + codeMaybeTruncated}
      metadata={
        <List.Item.Detail.Metadata>
          {version !== undefined ? <List.Item.Detail.Metadata.Label title="Version" text={String(version)} /> : null}
          {privacy ? (
            <List.Item.Detail.Metadata.Label
              title="Visibility"
              text={p ? "Public" : privacy === "unlisted" ? `Unlisted (private)` : `Private`}
            />
          ) : null}
          {runStartAt ? (
            <List.Item.Detail.Metadata.Label
              title="Last Run by Author"
              text={formatDistance(new Date(runStartAt), new Date(), { addSuffix: true }) + ` (${runStartAt})`}
            />
          ) : null}
          {runEndAt && runStartAt ? (
            <List.Item.Detail.Metadata.Label
              title="Run Execution Time"
              text={formatDistance(new Date(runStartAt), new Date(runEndAt), { addSuffix: false })}
            />
          ) : null}
          <List.Item.Detail.Metadata.TagList title="Metadata">
            {likeCount !== undefined ? (
              <List.Item.Detail.Metadata.TagList.Item color={Color.Green} text={`Likes: ${likeCount}`} />
            ) : null}
            {referenceCount !== undefined ? (
              <List.Item.Detail.Metadata.TagList.Item color={Color.Blue} text={`References: ${referenceCount}`} />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
};
