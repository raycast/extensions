import { Action, getPreferenceValues } from "@raycast/api";

const {company_id} = getPreferenceValues<Preferences>()
export default function OpenInSevalla({title="Open in Sevalla", route}: {title?:string, route: string}) {
    return <Action.OpenInBrowser title={title} url={`https://app.sevalla.com/${route}?idCompany=${company_id}`} />
}