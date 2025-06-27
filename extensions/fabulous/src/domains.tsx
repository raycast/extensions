import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { XMLParser } from "fast-xml-parser";

const {username,password} = getPreferenceValues<Preferences>();
const parser = new XMLParser();

interface XMLResult<T> {
  fabulous: {
    response: {
      status: number;
      reason: string;
      results?: T;
    }
  }
}

function generateApiUrl(route: string, params: Record<string, string> = {}) {
  const url = new URL(route, "https://api.fabulous.com/");
  url.searchParams.append("username", username);
  url.searchParams.append("password", password);
  Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));
  return url.toString();
}

function useFabulous<T>(route: string, params?: Record<string, string>) {
  return useFetch(generateApiUrl(route, params), {
    async parseResponse(response) {
      const txt = await response.text();
      const obj: XMLResult<T> = await parser.parse(txt);
      const { status } = obj.fabulous.response;
      if (status!==200) throw new Error(obj.fabulous.response.reason);
      return obj.fabulous.response.results;
    }
  })
}

export default function Domains() {
  const { isLoading, data: domains = [] } = useFabulous<Array<{domain: string; exdate: string;}>>("listDomains");
  return <List isLoading={isLoading}>
    {domains.map(domainItem => <List.Item key={domainItem.domain} icon={getFavicon(`https://${domainItem.domain}`)} title={domainItem.domain} accessories={[
      {date: new Date(domainItem.exdate)}
    ]} actions={<ActionPanel>
      {/* eslint-disable-next-line @raycast/prefer-title-case */}
      <Action.Push icon={Icon.List} title="DNS Records" target={<DNSRecords domain={domainItem.domain} />} />
    </ActionPanel>} />)}
  </List>
}

function DNSRecords({domain}: {domain: string}) {
  const {isLoading, data: records = []} = useFabulous<Array<{ id: number; name: string; }>>("listDNSrecords", {
    domain
  });
  return <List isLoading={isLoading}>
    {records.map(record => <List.Item key={record.id} title={record.name} />)}
  </List>
}