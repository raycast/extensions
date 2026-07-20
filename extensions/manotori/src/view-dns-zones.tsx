import { FormValidation, getFavicon, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL, DNS_RECORD_TYPE_TO_PLACEHOLDER } from "./config";
import { DNSRecord, DNSZone } from "./types";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { parseResponse } from "./utils";

export default function ViewDNSZones() {
  const { isLoading, data } = useFetch<DNSZone[], DNSZone[]>(API_URL + "dns/zone", {
    headers: API_HEADERS,
    parseResponse,
    initialData: [],
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search dns zone" isShowingDetail>
      {data.map((item) => (
        <List.Item
          key={item.zone_id}
          icon={getFavicon(`https://${item.zone}`, { fallback: Icon.Globe })}
          title={item.zone}
          detail={<List.Item.Detail markdown={item.ns_resource_records.replaceAll(", ", "\n\n")} />}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Eye}
                // eslint-disable-next-line @raycast/prefer-title-case
                title="View DNS Records"
                target={<ViewDNSRecords zoneId={item.zone_id} domainName={item.zone} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewDNSRecords({ zoneId, domainName }: { zoneId: number; domainName: string }) {
  const { isLoading, data, revalidate } = useFetch<DNSRecord[], DNSRecord[]>(
    API_URL + "dns/zone/" + zoneId + "/records",
    {
      headers: API_HEADERS,
      parseResponse,
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search dns record" isShowingDetail>
      {data.map((item) => (
        <List.Item
          key={item.dns_record_id}
          icon={Icon.Text}
          title={item.name}
          detail={
            <List.Item.Detail
              markdown={item.content}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={item.type} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="TTL" text={item.ttl.toString()} />
                  {item.prio ? (
                    <List.Item.Detail.Metadata.Label title="Priority" text={item.prio.toString()} />
                  ) : undefined}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Create DNS Record"
                target={<CreateDNSRecord zoneId={item.zone_id} domainName={domainName} />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateDNSRecord({ zoneId, domainName }: { zoneId: number; domainName: string }) {
  const { pop } = useNavigation();
  type FormValues = {
    name: string;
    type: string;
    content: string;
    ttl: string;
    prio: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const res = await fetch(API_URL + "dns/zone/" + zoneId + "/records", {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify([
            {
              ...values,
              ttl: +values.ttl,
            },
          ]),
        });
        await parseResponse(res);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      content: FormValidation.Required,
      prio(value) {
        if (values.type === "MX") {
          if (!value) return "The item is required";
          if (value === "0") return;
          if (!Number(value) || Number(value) < 0) return "May only contain numeric characters";
          if (Number(value) > 100) return "Must be 100 or less";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={domainName} />
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.Dropdown title="Type" {...itemProps.type}>
        {Object.keys(DNS_RECORD_TYPE_TO_PLACEHOLDER).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Content" placeholder={DNS_RECORD_TYPE_TO_PLACEHOLDER[values.type]} {...itemProps.content} />
      {values.type === "MX" && <Form.TextField title="Prio" placeholder="Prio" {...itemProps.prio} />}
      <Form.Dropdown title="TTL" {...itemProps.ttl}>
        {["60", "300", "900", "1800", "3600", "7200"].map((ttl) => (
          <Form.Dropdown.Item key={ttl} title={ttl} value={ttl} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
