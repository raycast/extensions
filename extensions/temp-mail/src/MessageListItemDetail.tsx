import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import useEmail, { Message } from "./useEmail";
import TurndownService from "turndown";

const turndownService = new TurndownService();

type Props = {
  message: Message;
  getMessageBody: (id: string) => Promise<string>;
};

export default function MessageListItemDetail({ message, getMessageBody }: Props) {
  const [markdown, setMarkdown] = useState<string>("");

  const fetchMessage = async () => {
    const body = await getMessageBody(message.id);
    const markdown = turndownService.turndown(body);
    setMarkdown(markdown);
  };

  useEffect(() => void fetchMessage(), []);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Subject" icon={Icon.QuotationMarks} text={message.subject} />
          <List.Item.Detail.Metadata.Label
            title="From"
            icon={Icon.PersonCircle}
            text={`${message.name} (${message.email})`}
          />
          <List.Item.Detail.Metadata.Label
            title="Date"
            icon={Icon.Clock}
            text={new Date(message.date).toTimeString()}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
