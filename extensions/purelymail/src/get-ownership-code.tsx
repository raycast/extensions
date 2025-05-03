import { List, Action, ActionPanel } from "@raycast/api";
import { OPTIONAL_OWNERSHIP_DNS_RECORDS, REQUIRED_OWNERSHIP_DNS_RECORDS } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";
import { useOwnershipCode } from "./utils/hooks";

export default function GetOwnershipCode() {
  const { isLoading, data: ownershipCode, error } = useOwnershipCode();

  return error ? (
    <ErrorComponent error={error.message} />
  ) : (
    <List isLoading={isLoading}>
      <List.Section title="Required">
        {REQUIRED_OWNERSHIP_DNS_RECORDS.map((r) => (
          <DNSRecordListItem key={r.value} type={r.type} host={r.host} value={r.value} ownershipCode={ownershipCode} />
        ))}
        {ownershipCode && (
          <DNSRecordListItem
            key={ownershipCode}
            type="TXT"
            host=""
            value={ownershipCode}
            ownershipCode={ownershipCode}
          />
        )}
      </List.Section>
      <List.Section title="Optional">
        {OPTIONAL_OWNERSHIP_DNS_RECORDS.map((r) => (
          <DNSRecordListItem key={r.value} type={r.type} host={r.host} value={r.value} ownershipCode={ownershipCode} />
        ))}
      </List.Section>
    </List>
  );
}

type DNSRecordListItemProps = {
  type: string;
  host: string;
  value: string;
  ownershipCode: string | undefined;
};
function DNSRecordListItem({ type, host, value, ownershipCode }: DNSRecordListItemProps) {
  return (
    <List.Item
      key={value}
      title={value}
      subtitle={"HOST: " + (host || "(Empty)")}
      accessories={[{ tag: type }]}
      actions={
        <ActionPanel title="Copy">
          <Action.CopyToClipboard title="Copy Value" content={value} />
          <Action.CopyToClipboard title="Copy Host" content={host} />
          <Action.CopyToClipboard title="Copy Type" content={type} shortcut={{ modifiers: ["cmd"], key: "t" }} />
          <Action.CopyToClipboard
            title="Copy All as JSON"
            content={JSON.stringify([
              ...REQUIRED_OWNERSHIP_DNS_RECORDS,
              { type: "TXT", host: "", value: ownershipCode },
              ...OPTIONAL_OWNERSHIP_DNS_RECORDS,
            ])}
          />
        </ActionPanel>
      }
    />
  );
}
