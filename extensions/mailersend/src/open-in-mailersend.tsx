import { Action } from "@raycast/api";

export default function OpenInMailerSend({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="symbol-512.png"
      title="Open in Mailersend"
      url={`https://app.mailersend.com/${route}`}
    />
  );
}
