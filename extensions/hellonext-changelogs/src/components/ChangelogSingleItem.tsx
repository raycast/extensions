import { Action, ActionPanel, Detail } from "@raycast/api";
import { Changelog } from "../utils/hellonext";
import TurndownService = require("turndown");

interface ChangelogSingleItemProps {
  changelog: Changelog;
}

export default function ChangelogSingleItem({ changelog }: ChangelogSingleItemProps) {
  const turndownService = new TurndownService();
  return (
    <>
      <Detail
        markdown={
          changelog.description ? turndownService.turndown(changelog.description.toString()) : "No description added"
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={changelog.url} />
          </ActionPanel>
        }
        navigationTitle={changelog.title}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Published On" text={changelog.published_on} />
            <Detail.Metadata.Label title="Published By" text={changelog.author.name} />
          </Detail.Metadata>
        }
      />
    </>
  );
}
