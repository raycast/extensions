import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Announcement } from "./types/common";
import { formatDate } from "./utils";

export function AnnouncementDetails({ announcement }: { announcement: Announcement }) {
  const hasLink = announcement.linkBody && announcement.linkUrl;
  const description = `# ${announcement.title}

${announcement.description ?? "No further details"}
`;

  return (
    <Detail
      markdown={description}
      navigationTitle={announcement.title}
      actions={
        <ActionPanel>
          {hasLink && (
            <Action.OpenInBrowser title="Open Link in Browser" icon={Icon.Globe} url={announcement.linkUrl as string} />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Start" text={formatDate(announcement.start)} />
          <Detail.Metadata.Label title="End" text={formatDate(announcement.end)} />
          {hasLink && (
            <Detail.Metadata.Link
              title="Link"
              target={announcement.linkUrl as string}
              text={announcement.linkBody as string}
            />
          )}
        </Detail.Metadata>
      }
    />
  );
}
