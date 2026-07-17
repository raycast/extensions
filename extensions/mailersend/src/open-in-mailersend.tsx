import { Action } from "@raycast/api";

export default function OpenInMailerSend({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="symbol-512.png"
      // eslint-disable-next-line @raycast/prefer-title-case
      title="Open in MailerSend"
      url={`https://app.mailersend.com/${route}`}
    />
  );
}
