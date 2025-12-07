import { Action } from "@raycast/api";

export default function OpenInAlwaysdata({path}:{path:string}) {
    // eslint-disable-next-line @raycast/prefer-title-case
    return <Action.OpenInBrowser icon="alwaysdata.png" title="Open in alwaysdata" url={`https://admin.alwaysdata.com/${path}/`} />
}