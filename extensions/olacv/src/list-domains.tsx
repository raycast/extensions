import { getFavicon, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./config";
import { Domain, Result } from "./types";
import { Color, Icon, List } from "@raycast/api";

export default function ListDomains() {
  const { isLoading, data: domains } = useFetch(API_URL + "domains", {
    headers: API_HEADERS,
    mapResult(result: Result<Domain[]>) {
      return {
        data: result.data
      }
    },
    initialData: []
  })

  return <List isLoading={isLoading}>
    {domains.map(domain => <List.Item key={domain.id} icon={getFavicon(`https://${domain.domain}`, { fallback: Icon.Globe })} title={domain.domain} accessories={[ {tag: {value: "AUTO_RENEW", color: domain.auto_renew ? Color.Green : Color.Red}} ]} />)}
  </List>
}
