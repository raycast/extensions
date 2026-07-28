import { Detail } from "@raycast/api";
import { EmailSender } from "../lib/types";

interface EmailDetailProps {
  sender: EmailSender;
  emailText: string;
}

export function EmailDetail({ sender, emailText }: EmailDetailProps) {
  const markdown = `### Email from ${sender.name}

${emailText}`;

  return <Detail markdown={markdown} />;
}
