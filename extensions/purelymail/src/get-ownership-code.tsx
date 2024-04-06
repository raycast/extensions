import { List, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import { getOwnershipCode } from "./utils/api";
import { Response } from "./utils/types";
import { OPTIONAL_OWNERSHIP_DNS_RECORDS, REQUIRED_OWNERSHIP_DNS_RECORDS } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";
import { useCachedState } from "@raycast/utils";

export default function GetOwnershipCode() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [ownershipCode, setOwnershipCode] = useCachedState<string>("ownership-code");

  useEffect(() => {
    async function getFromApi() {
      const response: Response = await getOwnershipCode();

      if (response.type === "error") {
        setError(response.message);
      } else {
        setOwnershipCode(response.result.code);
      }
      setIsLoading(false);
    }

    getFromApi();
  }, []);

  return error ? (
    <ErrorComponent error={error} />
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
