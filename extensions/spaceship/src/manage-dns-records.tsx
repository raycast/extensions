import {
  List,
  Icon,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  ActionPanel,
  Action,
  useNavigation,
  Form,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { DomainInfo, ResourceRecord, ResourceRecordsListCreateOrUpdateItem } from "./types";
import { useSpaceship, API_URL, API_HEADERS, parseResponse } from "./spaceship";

export default function ManageDNSRecords({ domain }: { domain: DomainInfo }) {
  const { isLoading, data: records, mutate, revalidate } = useSpaceship<ResourceRecord>(`dns/records/${domain.name}`);

  function generateAccessories(record: ResourceRecord) {
    const accessories: List.Item.Accessory[] = [{ tag: record.type, tooltip: "Type" }];

    if (record.ttl)
      accessories.unshift({
        icon: Icon.Clock,
        text: `${record.ttl / 60} min`,
        tooltip: "Time To Live",
      });
    if (record.address) accessories.unshift({ icon: Icon.Text, text: record.address, tooltip: "Address" });
    else if (record.value) accessories.unshift({ icon: Icon.Text, text: record.value, tooltip: "Value" });
    else if (record.exchange) accessories.unshift({ icon: Icon.Text, text: record.exchange, tooltip: "Exchange" });

    return accessories;
  }

  async function deleteRecord(record: ResourceRecord, index: number) {
    const options: Alert.Options = {
      title: `Delete ${record.type} record`,
      message:
        "Deleting DNS records might affect the correct working of this domain. This change might also take a while to propagate.",
      primaryAction: {
        title: "Yes, delete record",
        style: Alert.ActionStyle.Destructive,
      },
      rememberUserChoice: true,
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting record");
      try {
        await mutate(
          fetch(`${API_URL}dns/records/${domain.name}`, {
            method: "DELETE",
            headers: API_HEADERS,
            body: JSON.stringify([record]),
          }).then(parseResponse),
          {
            optimisticUpdate(data) {
              return data.filter((_, i) => i !== index);
            },
            shouldRevalidateAfter: false,
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Deleted record";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete record";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {domain.nameservers.provider === "custom" && (
        <List.EmptyView
          icon={Icon.Store}
          title="Managed with Custom DNS"
          description="To manage your records here, change nameservers back to Spaceship DNS. You can even choose to see your inactive records and prepare them before changing back."
        />
      )}
      <List.Section title={domain.nameservers.provider === "custom" ? "Inactive records" : "Active records"}>
        {records.map((record, index) => (
          <List.Item
            key={index}
            icon={Icon.Store}
            title={record.name}
            subtitle={`.${domain.name}`}
            accessories={generateAccessories(record)}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Record"
                  target={<CreateDNSRecord domain={domain} onRecordAdded={revalidate} />}
                />
                <Action
                  icon={Icon.Trash}
                  title={`Delete ${record.type} Record`}
                  onAction={() => deleteRecord(record, index)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CreateDNSRecord({ domain, onRecordAdded }: { domain: DomainInfo; onRecordAdded: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<{
    type: string;
    name: string;
    value: string;
    ttl: string;
    force: boolean;
    // MX
    preference: string;
  }>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Adding record");
      let item: ResourceRecordsListCreateOrUpdateItem | undefined;
      const common = {
        name: values.name,
        ttl: +values.ttl,
      };
      switch (values.type) {
        case "A":
        case "AAAA":
          item = {
            type: values.type,
            address: values.value,
            ...common,
          };
          break;
        case "CNAME":
          item = {
            type: "CNAME",
            cname: values.value,
            ...common,
          };
          break;
        case "MX":
          item = {
            type: "MX",
            exchange: values.value,
            preference: +values.preference,
            ...common,
          };
          break;
        case "TXT":
          item = {
            type: "TXT",
            value: values.value,
            ...common,
          };
          break;
      }

      try {
        await fetch(`${API_URL}dns/records/${domain.name}`, {
          method: "PUT",
          headers: API_HEADERS,
          body: JSON.stringify({
            force: values.force,
            items: [item],
          }),
        }).then(parseResponse);
        toast.style = Toast.Style.Success;
        toast.title = "Added record";
        onRecordAdded();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not add record";
        toast.message = `${error}`;
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      type: "A",
      ttl: "1800",
      force: false,
    },
    validation: {
      name(value) {
        if (!value) return "Invalid host value";
      },
      value: FormValidation.Required,
      preference(value) {
        if (values.type === "MX" && (!value || !Number(value) || +value < 0 || +value > 65535))
          return "Enter a value between 0 and 65535, only integer";
      },
    },
  });

  const TYPE_SPECIFIC_FIELDS: { [type: string]: { value: { title: string; placeholder: string; info: string } } } = {
    A: {
      value: {
        title: "Address",
        placeholder: "IP V4 Address",
        info: "IPv4 address",
      },
    },
    AAAA: {
      value: {
        title: "Address",
        placeholder: "IP V6 Address",
        info: "IPv6 address",
      },
    },
    CNAME: {
      value: {
        title: "CNAME",
        placeholder: "example.com",
        info: "Canonical (true) domain name that is used to resolve resource records",
      },
    },
    MX: {
      value: {
        title: "Exchange",
        placeholder: "mail exchange server",
        info: "Mail server that accepts mail",
      },
    },
    TXT: {
      value: {
        title: "Value",
        placeholder: "text data value",
        info: "Text value",
      },
    },
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="A" value="A" />
        <Form.Dropdown.Item title="AAAA" value="AAAA" />
        <Form.Dropdown.Item title="CNAME" value="CNAME" />
        <Form.Dropdown.Item title="MX" value="MX" />
        <Form.Dropdown.Item title="TXT" value="TXT" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        title="Host"
        placeholder="@"
        info="Enter @ to create a record for yourdomain.com. Enter blog to create a record for blog.yourdomain.com."
        {...itemProps.name}
      />
      <Form.TextField
        title={TYPE_SPECIFIC_FIELDS[values.type].value.title}
        placeholder={TYPE_SPECIFIC_FIELDS[values.type].value.placeholder}
        info={TYPE_SPECIFIC_FIELDS[values.type].value.info}
        {...itemProps.value}
      />
      {values.type === "MX" && (
        <Form.TextField
          title="Preference"
          placeholder="0 - 65535"
          info="Preference (distance) number of mail server"
          {...itemProps.preference}
        />
      )}
      <Form.Dropdown
        title="Time To Live (TTL)"
        info="Specifies the amount of time in seconds that a DNS record should be cached by a resolver or a caching server before it expires and needs to be refreshed from the authoritative DNS servers"
        {...itemProps.ttl}
      >
        <Form.Dropdown.Item title="60 min" value="3600" />
        <Form.Dropdown.Item title="30 min" value="1800" />
        <Form.Dropdown.Item title="20 min" value="1200" />
        <Form.Dropdown.Item title="5 min" value="300" />
        <Form.Dropdown.Item title="1 min" value="60" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox label="Turn-off conflicts resolution checker and force zone update" {...itemProps.force} />
    </Form>
  );
}
