import { useCachedPromise } from "@raycast/utils";
import { mxroute } from "./mxroute";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

function DNSInfoActions({ hostname, value }: { hostname: string; value: string }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Hostname" content={hostname} />
      <Action.CopyToClipboard title="Copy Value" content={value} />
    </ActionPanel>
  );
}
export default function DNSInfo({ domain }: { domain: string }) {
  const { isLoading, data } = useCachedPromise(async () => {
    const result = await mxroute.domains.dns.get(domain);
    if (result.mx_records.length === 1) {
      const [first, ...rest] = result.mx_records[0].hostname.split(".");
      const hostname = `${first}-relay.${rest.join(".")}`;
      result.mx_records.push({
        priority: 20,
        hostname,
        description: "Secondary mail server",
      });
    }
    return result;
  });
  return (
    <List isLoading={isLoading}>
      {data && (
        <>
          <List.Section title="MX Records">
            {data.mx_records.map((record, index) => (
              <List.Item
                key={record.hostname}
                title="@"
                subtitle={record.hostname}
                accessories={[{ icon: Icon[`Number${String((index + 1) * 10)}` as keyof typeof Icon] }, { tag: "MX" }]}
                actions={<DNSInfoActions hostname="@" value={record.hostname} />}
              />
            ))}
          </List.Section>
          <List.Section title="SPF Record">
            <List.Item
              title={data.spf.name}
              subtitle={data.spf.value}
              accessories={[{ tag: data.spf.type }]}
              actions={<DNSInfoActions hostname={data.spf.name} value={data.spf.value} />}
            />
          </List.Section>
          {data.dkim && (
            <List.Section title="DKIM Record">
              <List.Item
                title={data.dkim.name}
                subtitle={data.dkim.value}
                accessories={[{ tag: data.dkim.type }]}
                actions={<DNSInfoActions hostname={data.dkim.name} value={data.dkim.value} />}
              />
            </List.Section>
          )}
          {data.verification && (
            <List.Section title="Domain Verification Key">
              <List.Item
                title={data.verification.name}
                subtitle={data.verification.value}
                accessories={[{ tag: data.verification.type }]}
                actions={<DNSInfoActions hostname={data.verification.name} value={data.verification.value} />}
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
