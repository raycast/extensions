import { Action } from "@raycast/api";

export default function OpenInKeygen({route}: {route: string}) {
    return <Action.OpenInBrowser icon="logomark.png" title="Open in Keygen" url={`https://app.keygen.sh/${route}`} />
}