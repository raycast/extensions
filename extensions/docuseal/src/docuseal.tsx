import { DocusealApi } from "@docuseal/api";
import { Action, getPreferenceValues } from "@raycast/api";

const {instance_url, api_key} = getPreferenceValues<Preferences>();
export const ds = new DocusealApi({
    key: api_key,
    url: instance_url.includes("api.docuseal.com") ? instance_url : new URL("api", instance_url).toString()
});

export const OpenInDocuSeal = ({path}: {path: string}) => {
    const base = instance_url.includes("api.docuseal.com") ? "https://docuseal.com" : instance_url;
    const url = new URL(path, base).toString();
    return <Action.OpenInBrowser icon="docuseal.png" title="Open in DocuSeal" url={url} />
}