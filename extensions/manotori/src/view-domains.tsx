import { getFavicon, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./config";
import { Domain, DomainDetails, DomainEvent, SuccessResult, TRANSFER_LOCK } from "./types";
import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { parseResponse } from "./utils";

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return Color.Green;
    default:
      return undefined;
  }
}

export default function ViewDomains() {
  const { isLoading, data } = useFetch(API_URL + "domain", {
    headers: API_HEADERS,
    parseResponse,
    mapResult(result: SuccessResult<Domain[]>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      {data.map((item) => (
        <List.Item
          key={item.domain_id}
          icon={getFavicon(`https://${item.domain}`, { fallback: Icon.Globe })}
          title={item.domain}
          accessories={[
            { tag: { value: item.status, color: getStatusColor(item.status) } },
            { text: `on renewal: ${item.renewal_mode}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Eye}
                title="View Domain Details"
                target={<ViewDomainDetails domain={item.domain} />}
              />
              <Action.Push
                icon={Icon.List}
                title="View Domain Events"
                target={<ViewDomainEvents domain={item.domain} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewDomainDetails({ domain }: { domain: string }) {
  const { isLoading, data } = useFetch(API_URL + "domain/" + domain, {
    headers: API_HEADERS,
    parseResponse,
    mapResult(result: SuccessResult<DomainDetails>) {
      return {
        data: result.data,
      };
    },
  });

  const markdown = !data
    ? ""
    : `${data.domain} \n---\n
| - | At |
|---|---|
| Registered | ${data.registered_at ?? "-"} |
| Transferred | ${data.transferred_at ?? "-"} |
| Renewal | ${data.renewal_at} |
| Expire | ${data.expire_at} |
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={data.domain_id.toString()} />
            <Detail.Metadata.TagList title="TLD">
              <Detail.Metadata.TagList.Item text={data.tld} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text={data.status} color={getStatusColor(data.status)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="DNSSEC" icon={data.is_dnssec_active ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label
              title="Transfer Lock"
              icon={
                !data.transfer_lock
                  ? Icon.QuestionMark
                  : data.transfer_lock === TRANSFER_LOCK.LOCKED
                    ? Icon.Lock
                    : Icon.LockUnlocked
              }
            />
          </Detail.Metadata>
        )
      }
      actions={
        data && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Auth Code to Clipboard" content={data.auth_code} />
          </ActionPanel>
        )
      }
    />
  );
}

function ViewDomainEvents({ domain }: { domain: string }) {
  const { isLoading, data } = useFetch(API_URL + "domain/log/" + domain, {
    headers: API_HEADERS,
    parseResponse,
    mapResult(result: SuccessResult<DomainEvent[]>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  function getEventDetails(code: number) {
    switch (code) {
      case 3001:
        return "The domain was successfully transferred from the previous provider to manotori.";
      case 2015:
        return "The system will now check the validity of the auth code and if the domain is authorized for the transfer. You can then confirm or reject the transfer at your previous provider.";
      case 1001:
        return "The transfer of the domain has been requested.";
      default:
        return "";
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search event" isShowingDetail>
      <List.Section title={domain}>
        {data.map((event, index) => (
          <List.Item
            key={index}
            title={event.status}
            accessories={[{ date: new Date(event.created_at) }]}
            detail={
              <List.Item.Detail
                markdown={getEventDetails(event.notification_code)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Code" text={event.notification_code.toString()} />
                    <List.Item.Detail.Metadata.Label title="Date" text={event.created_at.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
