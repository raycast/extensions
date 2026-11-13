import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { AtomDNSRecord, AtomDomain, AtomError, AtomNameservers, AtomSuccess, Pagination } from "./types";
import { API_HEADERS, API_URL, parseAtomResponse, showError } from "./atom";

export default function DomainManager() {
  const {
    isLoading,
    data: domains,
    pagination,
  } = useFetch(
    (options) =>
      `${API_URL}/domains?` +
      new URLSearchParams({
        page: String(options.page + 1),
        size: "20",
      }),
    {
      headers: API_HEADERS,
      async parseResponse(response) {
        const result = (await response.json()) as AtomError | (AtomSuccess<AtomDomain[]> & Pagination);
        if (!result.success) throw new Error(result.message);
        if (!result.pagination.current_page)
          result.pagination.current_page = Number(new URL(response.url).searchParams.get("page")); // current_page seems to be null when there is only 1 item
        return result;
      },
      mapResult(result) {
        return {
          data: result.data,
          hasMore: result.pagination.current_page! < result.pagination.total_pages,
        };
      },
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {domains.map((domain) => (
        <List.Item
          key={domain.domain_name}
          icon={{
            source: Icon.Dot,
            tintColor: domain.status === "Active" ? Color.Green : undefined,
            tooltip: domain.status,
          }}
          title={domain.domain_name}
          accessories={[
            domain.privacy_protect ? { icon: Icon.EyeDisabled, tooltip: "This Domain is Private" } : { icon: Icon.Eye },
            domain.transfer_locked ? { icon: Icon.Lock, tooltip: "60-day transfer lock" } : { icon: Icon.LockUnlocked },
            {
              ...(domain.icann_transfer_lock && {
                icon: Icon.Lock,
                tag: { value: "TRANSFER PROTECTED", color: Color.Green },
              }),
            },
            {
              text: `Expires: ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(domain.expiry_date))}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.List}
                title="Manage Nameservers"
                target={<ManageNameservers domainName={domain.domain_name} />}
              />
              <Action.Push icon={Icon.Text} title="Manage DNS" target={<ManageDNS domainName={domain.domain_name} />} />
              <ActionPanel.Section title="Privacy">
                <Action.OpenInBrowser
                  title="Check WHOIS Info"
                  url={`https://www.atom.com/whois/${domain.domain_name}`}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ManageNameservers({ domainName }: { domainName: string }) {
  const { handleSubmit, itemProps, values, setValue } = useForm<{ type: string; nameservers: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating");
      try {
        const nameservers = values.type === "custom" ? values.nameservers.split("\n") : [];
        const response = await fetch(`${API_URL}/domains/${domainName}/nameservers`, {
          method: "PUT",
          headers: API_HEADERS,
          body: JSON.stringify({
            type: values.type,
            nameservers,
          }),
        });
        await parseAtomResponse(response);
        toast.title = "Updated";
        await popToRoot();
      } catch (error) {
        showError(error);
      }
    },
    validation: {
      nameservers(value) {
        if (values.type === "custom" && !value) return "The item is required";
      },
    },
  });

  const { isLoading } = useFetch(`${API_URL}/domains/${domainName}/nameservers`, {
    headers: API_HEADERS,
    parseResponse: parseAtomResponse<AtomNameservers>,
    initialData: [],
    keepPreviousData: false,
    onData(data) {
      setValue("type", data.type);
      if (data.type === "custom") setValue("nameservers", data.nameservers.join("\n"));
    },
  });

  const FORM_DESCRIPTION: { [key: string]: string } = {
    parking: `Use Atom nameservers to manage DNS records directly in Atom.

ns1.atomregistrar.com
ns2.atomregistrar.com`,
    atom: `Use these if you plan to list the domain for sale on Atom Marketplace.
        
ns1.atom.com
ns2.atom.com`,
    custom: `Use external nameservers or hosting providers to manage DNS records outside Atom.`,
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Manage Domains / ${domainName} / Nameservers`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Manage Nameservers" {...itemProps.type}>
        <Form.Dropdown.Item title="Atom Default Nameservers" value="parking" />
        <Form.Dropdown.Item title="Atom Marketplace Nameservers" value="atom" />
        <Form.Dropdown.Item title="My Own Nameservers" value="custom" />
      </Form.Dropdown>
      <Form.Description text={FORM_DESCRIPTION[values.type]} />
      {values.type === "custom" && (
        <Form.TextArea
          title="Enter nameservers"
          placeholder="ns1.example.com
ns2.example.com"
          {...itemProps.nameservers}
        />
      )}
    </Form>
  );
}

function ManageDNS({ domainName }: { domainName: string }) {
  const {
    isLoading,
    data: records,
    mutate,
  } = useFetch(`${API_URL}/domains/${domainName}/records`, {
    headers: API_HEADERS,
    parseResponse: parseAtomResponse<{ records: AtomDNSRecord[] }>,
    mapResult(result) {
      return { data: result.records };
    },
    initialData: [],
    keepPreviousData: false,
  });

  const confirmAndDelete = (recordId: number) => {
    confirmAlert({
      icon: Icon.Info,
      title: "Confirm Delete",
      message: "Are you sure you want to delete this DNS record?",
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting");
          try {
            await mutate(
              fetch(`${API_URL}/domains/${domainName}/records/${recordId}`, {
                method: "DELETE",
                headers: API_HEADERS,
              }).then(parseAtomResponse),
              {
                optimisticUpdate(data) {
                  return data.filter((r) => r.id !== recordId);
                },
                shouldRevalidateAfter: false,
              },
            );
            toast.title = "Deleted";
          } catch (error) {
            showError(error);
          }
        },
      },
    });
  };

  return (
    <List isLoading={isLoading} navigationTitle={`Manage Domains / ${domainName} / DNS`}>
      {records.map((record) => (
        <List.Item
          key={record.id}
          title={record.type}
          subtitle={record.name}
          accessories={[{ text: record.content }, { text: `${record.ttl / 60} min` }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Record"
                target={<AddRecord domainName={domainName} />}
                onPop={mutate}
              />
              {record.type !== "NS" && (
                <Action
                  icon={Icon.Trash}
                  title="Delete Record"
                  onAction={() => confirmAndDelete(record.id)}
                  style={Action.Style.Destructive}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddRecord({ domainName }: { domainName: string }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<{
    type: string;
    name: string;
    content: string;
    ttl: string;
    comment: string;
  }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Saving");
      try {
        const response = await fetch(`${API_URL}/domains/${domainName}/records`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            ...values,
            ttl: +values.ttl,
          }),
        });
        await parseAtomResponse(response);
        toast.title = "Saved";
        pop();
      } catch (error) {
        showError(error);
      }
    },
    validation: {
      name: FormValidation.Required,
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="A" value="A" />
        <Form.Dropdown.Item title="TXT" value="TXT" />
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder="@" {...itemProps.name} />
      {values.type === "A" ? (
        <Form.TextField
          title="IP V4 Address"
          placeholder="e.g. 93.184.216.34"
          info="The IPv4 address that this domain or subdomain should point to. Must be a valid IPv4 format (e.g., 192.0.2.1)."
          {...itemProps.content}
        />
      ) : values.type === "AAAA" ? (
        <Form.TextField
          title="IP V6 Address"
          placeholder="e.g. 2001:0db8:85a3::8a2e:0370:7334"
          {...itemProps.content}
        />
      ) : (
        <Form.TextField
          title="Value"
          placeholder="Text Data"
          info="Enter the value of the TXT record. Example: text data"
          {...itemProps.content}
        />
      )}
      <Form.Dropdown title="TTL" {...itemProps.ttl}>
        <Form.Dropdown.Item title="1 min" value="60" />
        <Form.Dropdown.Item title="5 min" value="300" />
        <Form.Dropdown.Item title="10 min" value="600" />
        <Form.Dropdown.Item title="15 min" value="900" />
        <Form.Dropdown.Item title="30 min" value="1800" />
        <Form.Dropdown.Item title="45 min" value="2700" />
        <Form.Dropdown.Item title="60 min" value="3600" />
      </Form.Dropdown>
      <Form.TextField
        title="Comment (optional)"
        info="Note: The details shown here do not affect DNS record resolution and are provided for reference only."
        {...itemProps.comment}
      />
    </Form>
  );
}
