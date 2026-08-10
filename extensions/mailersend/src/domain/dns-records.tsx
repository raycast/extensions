import { List, Icon } from "@raycast/api";
import { Domain, DNSRecord, type DNSRecords } from "../interfaces";
import { useMailerSend } from "../mailersend";

function DNSRecordItem({ title, record }: { title: string; record: DNSRecord }) {
  return (
    <List.Item
      icon={Icon.Text}
      title={title}
      detail={
        <List.Item.Detail
          markdown={Object.entries(record)
            .map(([title, text]) => `## ${title} \n ${text}`)
            .join(`\n`)}
        />
      }
    />
  );
}

export default function DNSRecords({ domain }: { domain: Domain }) {
  const { isLoading, data } = useMailerSend<DNSRecords>(`domains/${domain.id}/dns-records`);

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data && (
        <>
          <DNSRecordItem title="spf" record={data.spf} />
          <DNSRecordItem title="dkim" record={data.dkim} />
          <DNSRecordItem title="return_path" record={data.return_path} />
          <DNSRecordItem title="custom_tracking" record={data.custom_tracking} />
          <DNSRecordItem title="inbound_routing" record={data.inbound_routing} />
        </>
      )}
    </List>
  );
}
