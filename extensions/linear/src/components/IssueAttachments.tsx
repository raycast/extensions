import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { format } from "date-fns";

import { Attachment, IssueResult } from "../api/getIssues";

import { IssueAttachmentsForm } from "./IssueAttachmentsForm";

type IssueAttachmentProps = {
  attachments: Attachment[];
  issue: IssueResult;
};

export default function IssueAttachments({ attachments, issue }: IssueAttachmentProps) {
  return (
    <List navigationTitle={`Links for ${issue.identifier}`}>
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
                <Action.Push
                  title="Add Attachments and Links"
                  icon={Icon.NewDocument}
                  target={<IssueAttachmentsForm {...{ issue }} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
