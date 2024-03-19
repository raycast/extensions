import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Attachment } from "../api/getIssues";
import { format } from "date-fns";

type IssueAttachmentProps = {
  attachments: Attachment[];
};

export default function IssueAttachments({ attachments }: IssueAttachmentProps) {
  return (
    <List>
      {attachments.map((attachment) => {
        const updatedAt = new Date(attachment.updatedAt);

        return (
          <List.Item
            icon={attachment.source?.imageUrl ?? Icon.Link}
            key={attachment.id}
            title={attachment.title}
            subtitle={attachment.subtitle}
            accessories={[
              {
                date: updatedAt,
                tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={attachment.url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
