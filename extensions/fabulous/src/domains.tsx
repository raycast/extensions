import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise, useFetch } from "@raycast/utils";
import { XMLParser } from "fast-xml-parser";

interface Domain {
  domain: string;
  exdate: string;
}
interface DomainInfo {
  expiry: string;
  nameservers: {
    nameserver: string[];
  };
}
interface DNSRecord {
  id: number;
  name: string;
  type: string;
  content: string;
}
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
const parser = new XMLParser({
  isArray: (name) => ["result", "nameserver"].includes(name),
});

function buildApiUrl(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(endpoint, "https://api.fabulous.com/");
  url.searchParams.append("username", username);
  url.searchParams.append("password", password);
  Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));
  return url.toString();
}
async function parseApiResponse<T>(response: Response) {
  const txt = await response.text();
  const obj: XMLResult<T> = await parser.parse(txt);
  const { status } = obj.fabulous.response;
  if (![200, 201, 202].includes(status)) throw new Error(obj.fabulous.response.reason);
  return obj.fabulous.response.results?.result;
}
async function callApi<T>(endpoint: string, params: Record<string, string> = {}) {
  const response = await fetch(buildApiUrl(endpoint, params));
  const result = await parseApiResponse<T>(response);
  return result;
}

export default function Domains() {
  const {
    isLoading,
    data: domains,
    error,
  } = useCachedPromise(
    async () => {
      const domains = (await callApi<Domain[]>("listDomains")) ?? [];
      const infos = await Promise.all(
        domains.map(({ domain }) => callApi<DomainInfo>("domainInfo", { domain: domain })),
      );
      return domains.map((domain, index) => ({ ...domain, ...infos[index] }));
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !domains.length && !error ? (
        <List.EmptyView
          title="No Results"
          description="Go online to register a domain"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Register Domain" url="https://fabulous.com/search" />
            </ActionPanel>
          }
        />
      ) : (
        domains.map((domainItem) => (
          <List.Item
            key={domainItem.domain}
            icon={getFavicon(`https://${domainItem.domain}`, { fallback: Icon.Globe })}
            title={domainItem.domain}
            accessories={[{ date: new Date(domainItem.exdate) }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.List} title="DNS Records" target={<DNSRecords domain={domainItem.domain} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function DNSRecords({ domain }: { domain: string }) {
  const { isLoading, data: records = [] } = useFetch(buildApiUrl("listDNSrecords", { domain }), {
    parseResponse: parseApiResponse<DNSRecord[]>,
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {records.map((record, recordIndex) => (
        <List.Item
          key={recordIndex}
          icon={Icon.Text}
          title={record.name}
          accessories={[{ tag: record.type }]}
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
