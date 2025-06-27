import { Action } from "@raycast/api";

export default function OpenInMailerSend({route}: {route: string}) {
    // eslint-disable-next-line @raycast/prefer-title-case
    return <Action.OpenInBrowser icon="symbol-512.png" title="Open in MailerSend" url={`https://app.mailersend.com/${route}`} />
}