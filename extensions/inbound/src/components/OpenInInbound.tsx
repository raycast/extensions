import { Action } from "@raycast/api";

export default function OpenInInbound({route}: {route:string}) {
    return <Action.OpenInBrowser title="Open in Inbound" url={`https://inbound.new/${route}`} />
}