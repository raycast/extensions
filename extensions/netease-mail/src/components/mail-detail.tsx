import { Detail } from "@raycast/api";
import { MailMessage } from "../lib/mail-client.js";

export function MailDetail({ message }: { message: MailMessage }) {
  return (
    <Detail
      markdown={toMarkdown(message)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={message.from} />
          {message.fromAddress ? <Detail.Metadata.Label title="Address" text={message.fromAddress} /> : null}
          <Detail.Metadata.Label title="To" text={message.to || "-"} />
          <Detail.Metadata.Label title="Date" text={message.date?.toLocaleString() || "-"} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={message.seen ? "Read" : "Unread"}
              color={message.seen ? undefined : "red"}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

function toMarkdown(message: MailMessage): string {
  return `# ${escapeMarkdown(message.subject)}

${message.text || message.snippet || "_No readable body text found._"}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}
