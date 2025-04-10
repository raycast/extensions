import { Action, ActionPanel, Alert, Color, confirmAlert, Form, getPreferenceValues, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { getFavicon, useCachedState, useFetch, useForm } from "@raycast/utils";
import { DomainInfo, ErrorResult, SuccessResult, ResourceRecord, DomainClientEPPStatus, ResourceRecordsListCreateOrUpdateItem } from "./types";

const { apiKey, apiSecret } = getPreferenceValues<Preferences>();
const API_URL = "https://spaceship.dev/api/v1/";
const API_HEADERS = {
  "X-Api-Key": apiKey,
  "X-Api-Secret": apiSecret,
  "Content-Type": "application/json"
}
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

    if (record.ttl) accessories.unshift({
      icon: Icon.Clock,
      text: `${record.ttl/60} min`,
      tooltip: "Time To Live"
    })
    if (record.address) accessories.unshift({ icon: Icon.Text, text: record.address, tooltip: "Address" });
    else if (record.value) accessories.unshift({ icon: Icon.Text, text: record.value, tooltip: "Value" });

    return accessories;
  }

  async function deleteRecord(record: ResourceRecord) {
    const options: Alert.Options = {
      title: `Delete ${record.type} record`,
      message: "Deleting DNS records might affect the correct working of this domain. This change might also take a while to propagate.",
      primaryAction: {
        title: "Yes, delete record",
        style: Alert.ActionStyle.Destructive
      },
      rememberUserChoice: true
    }
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting record");
      try {
        await mutate(
          fetch(`${API_URL}dns/records/${domain.name}`, {
            method: "DELETE",
            headers: API_HEADERS,
            body: JSON.stringify({
              type: record.type,
              address: record.address,
              name: record.name
            })
          }).then(async (response) => {
            if (!response.ok) {
              const res: ErrorResult = await response.json();
              throw new Error(res.detail);
            }
          }), {
            optimisticUpdate(data) {
              return data.filter(r => r.type!==record.type && r.address!==record.address && r.name!==record.name);
            },
            shouldRevalidateAfter: false
          }
        )
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
          actions={<ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Record" target={<CreateDNSRecord domain={domain} onRecordAdded={revalidate} />} />
            <Action icon={Icon.Trash} title={`Delete ${record.type} Record`} onAction={() => deleteRecord(record)} style={Action.Style.Destructive} />
          </ActionPanel>}
        />
      ))}
      </List.Section>
    </List>
  );
}

function CreateDNSRecord({domain, onRecordAdded}: { domain: DomainInfo, onRecordAdded: () => void }) {
  const {pop} = useNavigation();
  const { handleSubmit, itemProps } = useForm<{
    type: string;
  }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding record");
      try {
        const response = await fetch(`${API_URL}dns/records/${domain.name}`, {
          method: "PUT",
          headers: API_HEADERS,
          body: JSON.stringify(values)
        });
        if (!response.ok) {
          const res: ErrorResult = await response.json();
          throw new Error(res.detail);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Added record";
        onRecordAdded();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not add record";
        toast.message = `${error}`;
      }
    },
  })
  return <Form actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Plus} title="Add" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Dropdown title="Type" {...itemProps.type}>
      <Form.Dropdown.Item title="A" value="A" />
      <Form.Dropdown.Item title="MX" value="MX" />
      <Form.Dropdown.Item title="TXT" value="TXT" />
    </Form.Dropdown>
  </Form>
}