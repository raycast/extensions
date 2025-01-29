import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { DomainInfo, ErrorResult, PaginatedResult } from "./types";

export default function ManageDomains() {
    const { apiKey, apiSecret } = getPreferenceValues<Preferences>();
    const { isLoading, data: domains } = useFetch("https://spaceship.dev/api/v1/domains?" + new URLSearchParams({
        take: "20",
        skip: "0"
    }).toString(), {
        headers: {
            "X-Api-Key": apiKey,
            "X-Api-Secret": apiSecret
        },
        async parseResponse(response) {
            if (!response.ok) {
                const res: ErrorResult = await response.json();
                throw new Error(res.detail);
            }
            const res: PaginatedResult<DomainInfo> = await response.json();
            return res.items;
        },
        initialData: []
    })

    return <List isLoading={isLoading}>
        {domains.map(domain => <List.Item key={domain.name} icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })} title={domain.name} accessories={[
            { date: new Date(domain.expirationDate), tooltip: `Expires on: ${domain.expirationDate}` },
            { tag: domain.privacyProtection.level==="high" ? "Private" : "Public", tooltip: "Privacy" }
        ]} actions={<ActionPanel>
            <Action.OpenInBrowser icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })} title={`Go to ${domain.name}`} url={`https://${domain.name}`} />
        </ActionPanel>} />)}
    </List>
}