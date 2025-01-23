import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Fragment } from "react";

export default function generateEvilInsult() {
  const { data, isLoading, revalidate } = useFetch<{
    number: string;
    language: string;
    insult: string;
    created: string;
    shown: string;
    createdby: string;
    active: string;
    comment: string;
  }>("https://evilinsult.com/generate_insult.php?lang=en&type=json", {
    failureToastOptions: {
      message: "Failed to fetch evil insult",
    },
    keepPreviousData: false,
  });

  return (
    <Detail
      isLoading={isLoading}
      markdown={`## "${data?.insult}"`}
      actions={
        <ActionPanel>
          <Action title="Generate New Insult" onAction={revalidate} icon={Icon.RotateClockwise} />
          {data?.insult ? (
            <Fragment>
              <Action.CopyToClipboard
                title="Copy Insult"
                content={data.insult}
                shortcut={{ key: "c", modifiers: ["cmd"] }}
                icon={Icon.Clipboard}
              />
              <Action.Paste
                title="Paste Insult in Active App"
                content={data.insult}
                shortcut={{ key: "v", modifiers: ["cmd"] }}
                icon={Icon.Pencil}
              />
            </Fragment>
          ) : null}
        </ActionPanel>
      }
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Number" text={data.number} />
            <Detail.Metadata.Label title="Date" text={data.created} />
            <Detail.Metadata.Label title="Created By" text={data.createdby} />
            <Detail.Metadata.Label title="Comment" text={data.comment} />
          </Detail.Metadata>
        ) : null
      }
    />
  );
}
