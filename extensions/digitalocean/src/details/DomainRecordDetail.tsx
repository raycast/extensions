import { type Domain, type DomainRecord } from "../client";
import { Action, ActionPanel, Detail } from "@raycast/api";

export default function DomainRecordDetail({ domain, record }: { domain: Domain; record: DomainRecord }) {
  const hostname = `${record.name !== "@" ? record.name + "." : ""}${domain.name}`;

  return (
    <Detail
      markdown={`\
### Name
\`\`\`
${record.name}
\`\`\`

### Data
\`\`\`
${record.data}
\`\`\`
`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={record.data} title="Copy Data" />
          <Action.CopyToClipboard content={hostname} title="Copy Hostname" />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={record.type} />
          <Detail.Metadata.Label title="Hostname" text={hostname} />
          {typeof record.priority !== "string" ? null : (
            <Detail.Metadata.Label title="Priority" text={record.priority} />
          )}
          {typeof record.port !== "string" ? null : <Detail.Metadata.Label title="Port" text={record.port} />}
          {typeof record.ttl !== "number" ? null : <Detail.Metadata.Label title="TTL" text={record.ttl + "s"} />}
          {typeof record.weight !== "number" ? null : (
            <Detail.Metadata.Label title="Weight" text={String(record.weight)} />
          )}
          {typeof record.flags !== "number" ? null : (
            <Detail.Metadata.Label title="Flags" text={String(record.flags) || "None"} />
          )}
          {typeof record.tag !== "number" ? null : <Detail.Metadata.Label title="Tag" text={String(record.tag)} />}
        </Detail.Metadata>
      }
    />
  );
}
