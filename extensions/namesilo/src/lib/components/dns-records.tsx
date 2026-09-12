import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import useNameSilo from "../hooks/useNameSilo";
import { type AddDNSRecord, ArrOrObjOrNull, DNSRecord } from "../types";
import { parseAsArray } from "../utils/parseAsArray";
import { useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import { DNS_RECORD_TYPES } from "../constants";

export default function DNSRecords({ domain }: { domain: string }) {
  type DNSRecordsResponse = { resource_record: ArrOrObjOrNull<DNSRecord> };
  const { isLoading, data, revalidate } = useNameSilo<DNSRecordsResponse>("dnsListRecords", {
    domain,
  });
  const records = parseAsArray(data?.resource_record);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search record">
      {!isLoading && !records.length ? (
        <List.EmptyView
          title="No dns records in your domain"
          description="Add dns records to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add DNS Record"
                target={<AddDNSRecord domain={domain} onAdded={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Domains / ${domain} / DNS Records`}>
          {records.map((record) => (
            <List.Item
              key={record.record_id}
              title={record.host}
              subtitle={record.record_id}
              accessories={[
                { tag: record.type },
                { text: `TTL: ${record.ttl}` },
                { text: `distance: ${record.distance}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add DNS Record"
                    target={<AddDNSRecord domain={domain} onAdded={revalidate} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function AddDNSRecord({ domain, onAdded }: { domain: string; onAdded: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<AddDNSRecord>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      rrtype: Object.keys(DNS_RECORD_TYPES)[0],
      rrdistance: "10",
      rrttl: "7207",
    },
    validation: {
      rrtype: FormValidation.Required,
      rrvalue: FormValidation.Required,
      rrdistance(value) {
        if (values.rrtype === "MX") {
          if (!value) return "The item is required";
          if (!Number(value)) return "The item must be a number";
        }
      },
      rrttl(value) {
        if (!value) return "The item is required";
        if (!Number(value)) return "The item must be a number";
        else if (Number(value) < 3600) return "The item must be >= 3600";
      },
    },
  });

  const { isLoading } = useNameSilo<{ record_id: string }>(
    "dnsAddRecord",
    {
      domain,
      ...values,
    },
    {
      execute,
      async onData(data) {
        await showToast(Toast.Style.Success, "Added DNS Record", data.record_id);
        onAdded();
        pop();
      },
      onError() {
        setExecute(false);
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add DNS Record" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Domains / ${domain} / DNS Records / Add`} />
      <Form.Dropdown title="Type" {...itemProps.rrtype}>
        {Object.keys(DNS_RECORD_TYPES).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Host"
        placeholder="leave blank for *"
        info='No need to include the ".DOMAIN"'
        {...itemProps.rrhost}
      />
      <Form.TextField
        title="Value"
        placeholder={DNS_RECORD_TYPES[values.rrtype as keyof typeof DNS_RECORD_TYPES]}
        {...itemProps.rrvalue}
      />
      <Form.Description text={DNS_RECORD_TYPES[values.rrtype as keyof typeof DNS_RECORD_TYPES]} />
      {values.rrtype === "MX" && <Form.TextField title="Distance" placeholder="10" {...itemProps.rrdistance} />}
      <Form.TextField title="TTL" placeholder="7207" {...itemProps.rrttl} />
    </Form>
  );
}
