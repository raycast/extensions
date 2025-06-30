import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useCachedState, useFetch, useForm } from "@raycast/utils";
import {
  DomainInfo,
  ErrorResult,
  SuccessResult,
  ResourceRecord,
  DomainClientEPPStatus,
  ResourceRecordsListCreateOrUpdateItem,
} from "./types";
import { useState } from "react";

const { apiKey, apiSecret } = getPreferenceValues<Preferences>();
const API_URL = "https://spaceship.dev/api/v1/";
const API_HEADERS = {
  "X-Api-Key": apiKey,
  "X-Api-Secret": apiSecret,
  "Content-Type": "application/json",
};
function useSpaceship<T>(endpoint: string) {
  const { isLoading, data, mutate, revalidate } = useFetch(`${API_URL}${endpoint}?take=20&skip=0`, {
    headers: API_HEADERS,
    async parseResponse(response) {
      if (!response.ok) {
        const res: ErrorResult = await response.json();
        throw new Error(res.detail);
      }
      const res: SuccessResult<T> = await response.json();
      return res.items;
    },
    initialData: [],
  });
  return { isLoading, data, mutate, revalidate };
}

export default function ManageDomains() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details-domains", false);
  const { isLoading, data: domains } = useSpaceship<DomainInfo>("domains");

  function formatDate(date: string) {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
    const formattedDate = new Date(date).toLocaleDateString("en-US", options);
    return formattedDate;
  }

  function generateAccessories(domain: DomainInfo) {
    const accessories: List.Item.Accessory[] = [
      { tag: domain.privacyProtection.level === "high" ? "Private" : "Public", tooltip: "Privacy" },
    ];
    accessories.push({
      tag: domain.eppStatuses.includes(DomainClientEPPStatus.clientTransferProhibited)
        ? { value: "LOCKED", color: Color.Green }
        : { value: "UNLOCKED", color: Color.Red },
      tooltip: "Transfer lock",
    });
    accessories.push({
      date: new Date(domain.expirationDate),
      tooltip: `Expires on ${formatDate(domain.expirationDate)}`,
    });
    return accessories;
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {domains.map((domain) => (
        <List.Item
          key={domain.name}
          icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })}
          title={domain.name}
          accessories={isShowingDetail ? undefined : generateAccessories(domain)}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((show) => !show)}
              />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.Push icon={Icon.Store} title="Manage DNS Records" target={<ManageDNSRecords domain={domain} />} />
              <Action.OpenInBrowser
                icon={getFavicon(`https://${domain.name}`, { fallback: Icon.Globe })}
                title={`Go to ${domain.name}`}
                url={`https://${domain.name}`}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={`${domain.nameservers.provider} Nameservers \n\n ${domain.nameservers.hosts.join("\n\n")}`}
            />
          }
        />
      ))}
    </List>
  );
}

function ManageDNSRecords({ domain }: { domain: DomainInfo }) {
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
          }).then(async (response) => {
            if (!response.ok) {
              const res: ErrorResult = await response.json();
              throw new Error(res.detail);
            }
          }),
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
      switch (values.type) {
        case "A":
          item = {
            type: "A",
            address: values.value,
            name: values.name,
            ttl: +values.ttl,
          };
          break;
        case "MX":
          item = {
            type: "MX",
            exchange: values.value,
            name: values.name,
            preference: +values.preference,
            ttl: +values.ttl,
          };
          break;
        case "TXT":
          item = {
            type: "TXT",
            value: values.value,
            name: values.name,
            ttl: +values.ttl,
          };
          break;
      }

      try {
        const response = await fetch(`${API_URL}dns/records/${domain.name}`, {
          method: "PUT",
          headers: API_HEADERS,
          body: JSON.stringify({
            force: values.force,
            items: [item],
          }),
        });
        if (!response.ok) {
          const res: ErrorResult = await response.json();
          throw new Error(res.data ? res.data[0].details : res.detail);
        }
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
      value(value) {
        if (["A", "MX", "TXT"].includes(values.type) && !value) return "The item is required";
      },
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
