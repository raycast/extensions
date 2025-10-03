import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { XMLParser } from "fast-xml-parser";

interface Domain {
  domain: string; exdate: string
}
interface DNSRecord { id: number; name: string; type: string; content: string }
interface XMLResult<T> {
  fabulous: {
    response: {
      status: number;
      reason: string;
      results?: {
        result: T;
      };
    };
  };
}

const { username, password } = getPreferenceValues<Preferences>();
const parser = new XMLParser();

function buildApiUrl(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(endpoint, "https://api.fabulous.com/");
  url.searchParams.append("username", username);
  url.searchParams.append("password", password);
  Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));
  return url.toString();
}

function useFabulous<T>(endpoint: string, params?: Record<string, string>) {
  return useFetch(buildApiUrl(endpoint, params), {
    async parseResponse(response) {
      const txt = await response.text();
      const obj: XMLResult<T> = await parser.parse(txt);
      const { status } = obj.fabulous.response;
      if (status !== 200) throw new Error(obj.fabulous.response.reason);
      return obj.fabulous.response.results?.result;
    },
  });
}

export default function Domains() {
  const { isLoading, data: domains = [] } = useFabulous<Domain[]>("listDomains");
  return (
    <List isLoading={isLoading}>
      {domains.map((domainItem) => (
        <List.Item
          key={domainItem.domain}
          icon={getFavicon(`https://${domainItem.domain}`, {fallback: Icon.Globe})}
          title={domainItem.domain}
          accessories={[{ date: new Date(domainItem.exdate) }]}
          actions={
            <ActionPanel>
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push icon={Icon.List} title="DNS Records" target={<DNSRecords domain={domainItem.domain} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DNSRecords({ domain }: { domain: string }) {
  const { isLoading, data: records = [] } = useFabulous<
    DNSRecord[]
  >("listDNSrecords", {
    domain,
  });
  return (
    <List isLoading={isLoading} isShowingDetail>
      {records.map((record, recordIndex) => (
        <List.Item
          key={recordIndex}
          title={record.id.toString()}
          detail={
            <List.Item.Detail
              markdown={record.content}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={record.id.toString()} />
                  <List.Item.Detail.Metadata.Label title="Name" text={record.name} />
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={record.type} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
