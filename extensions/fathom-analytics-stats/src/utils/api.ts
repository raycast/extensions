import { getPreferenceValues } from "@raycast/api"
import { useFetch } from "@raycast/utils"

type Page = {
    pageviews: string;
    pathname: string;
};

type Data = Page[];

type Request = {
    endpoint: string;
    entity?: string;
    aggregates?: string;
    groupBy?: string;
    sortBy?: string;
    dateFrom: string;
}

export default function FathomRequest(request: Request) {
    const preferences = getPreferenceValues<Preferences>();
    const BASE_URL = "https://api.usefathom.com/v1"
    let url = ""

    if (request.aggregates) {
        url = `${BASE_URL}${request.endpoint}?entity_id=${preferences.siteId}&entity=${request.entity}&aggregates=${request.aggregates}&field_grouping=${request.groupBy}&sort_by=${request.sortBy}${request.dateFrom ? `&date_from=${request.dateFrom}` : ""}`
    } else {
        url = `${BASE_URL}${request.endpoint}?site_id=${preferences.siteId}&detailed=true`
    }

    const { data, isLoading } = useFetch<Data>(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${preferences.apiToken}`,
        },
    })

    return { data, isLoading }
}
