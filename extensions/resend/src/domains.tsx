import { useEffect, useState } from "react";
import { AddDomainRequest, AddDomainRequestForm, AddDomainResponse, Domain, GetDomainsResponse } from "./utils/types";
import { addDomain, deleteDomain, getDomains, verifyDomain } from "./utils/api";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { ADD_DOMAIN_REGIONS, RESEND_URL } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";

export default function Domains() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [domainsResponse, setDomainsResponse] = useState<GetDomainsResponse>();
  const [error, setError] = useState("");

  async function getDomainsFromApi() {
    setIsLoading(true);
    const response = await getDomains();
    if (!("statusCode" in response)) {
      const numOfDomains = response.data.length;
      await showToast({
        title: "Success",
        message: `Fetched ${numOfDomains} ${numOfDomains === 1 ? "domain" : "domains"}`,
        style: Toast.Style.Success,
      });
      setDomainsResponse(response);
    } else if (response.name === "validation_error" || response.name === "restricted_api_key") {
      setError(response.message);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    getDomainsFromApi();
  }, []);

  async function verifyDomainFromApi(domain: Domain) {
    setIsLoading(true);
    const response = await verifyDomain(domain.id);
    if (!("statusCode" in response)) {
      await showToast({
        title: "In Progress",
        message: "You will receive an email notification once this operation is completed.",
        style: Toast.Style.Success,
      });
    }
    setIsLoading(false);
  }

  async function confirmAndDelete(item: Domain) {
    if (
      await confirmAlert({
        title: `Delete '${item.name}'?`,
        message: `id: ${item.id}`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteDomain(item.id);
      if (!("statusCode" in response)) {
        await showToast(Toast.Style.Success, "Deleted Domain");
        await getDomainsFromApi();
      }
      setIsLoading(false);
    }
  }

  function getStatusColor(status: string) {
    if (status === "verified") return Color.Green;
    else if (status === "pending") return Color.Yellow;
    else if (status === "not_started") return Color.Orange;
    else if (status === "failed") return Color.Red;
    else return undefined;
  }

  const numOfDomains = domainsResponse && domainsResponse.data.length;
  const title = domainsResponse && `${numOfDomains} ${numOfDomains === 1 ? "domain" : "domains"}`;
  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      <List.Section title={title}>
        {domainsResponse?.data.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            icon={getFavicon(`https://${item.name}`, { fallback: Icon.Globe })}
            subtitle={item.id}
            accessories={[
              { tag: { value: item.status, color: getStatusColor(item.status) } },
              { icon: ADD_DOMAIN_REGIONS.find((region) => region.value === item.region)?.icon },
              { tag: new Date(item.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy ID to Clipboard" content={item.id} />
                <Action.CopyToClipboard title="Copy Name to Clipboard" content={item.name} />
                <Action.OpenInBrowser title="View Domain in Dashboard" url={`${RESEND_URL}domains/${item.id}`} />
                <Action
                  title="Verify Domain"
                  icon={Icon.WrenchScrewdriver}
                  onAction={() => verifyDomainFromApi(item)}
                />
                <Action
                  title="Delete Domain"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(item)}
                />
                <ActionPanel.Section>
                  <Action title="Add New Domain" icon={Icon.Plus} onAction={() => push(<DomainsAdd />)} />
                  <Action title="Reload Domains" icon={Icon.Redo} onAction={getDomainsFromApi} />
                  <Action.OpenInBrowser
                    title="View API Reference"
                    url={`${RESEND_URL}docs/api-reference/domains/list-domains`}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add New Domain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action title="Add New Domain" icon={Icon.Plus} onAction={() => push(<DomainsAdd />)} />
                <Action.OpenInBrowser
                  title="View API Reference"
                  url={`${RESEND_URL}docs/api-reference/domains/create-domain`}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload Domains"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action title="Reload Domains" icon={Icon.Redo} onAction={getDomainsFromApi} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function DomainsAdd() {
  const [isLoading, setIsLoading] = useState(false);
  const [newDomain, setNewDomain] = useState<AddDomainResponse>();

  const { handleSubmit, itemProps } = useForm<AddDomainRequestForm>({
    async onSubmit(values) {
      setIsLoading(true);

      const newDomainRequest: AddDomainRequest = {
        name: values.name,
        region: values.region === "us-east-1" ? "us-east-1" : values.region === "eu-west-1" ? "eu-west-1" : "sa-east-1",
      };

      const response = await addDomain(newDomainRequest);
      if (!("statusCode" in response)) {
        setNewDomain(response);
        showToast(Toast.Style.Success, "Added Domain", response.name);
      }
      setIsLoading(false);
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return !newDomain ? (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="View API Reference"
            url={`${RESEND_URL}docs/api-reference/domains/create-domain`}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="updates.example.com"
        info="The name of the domain you want to create."
        {...itemProps.name}
      />
      <Form.Dropdown title="Region" info="The region where emails will be sent from." {...itemProps.region}>
        {ADD_DOMAIN_REGIONS.map((region) => (
          <Form.Dropdown.Item
            title={region.title}
            key={region.value}
            value={region.value}
            icon={{ source: region.icon, fallback: Icon.Flag }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  ) : (
    <List navigationTitle={`Domains | ${newDomain.name} DNS Records`} searchBarPlaceholder="Search DNS record">
      <List.Section
        title={`${newDomain.name} | TO VIEW THESE DETAILS AGAIN YOU WILL HAVE TO CHECK THE DASHBOARD ONLINE`}
      >
        {newDomain.records.map((record) => (
          <List.Item
            title={record.name}
            subtitle={record.value}
            key={record.value}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Entire Record to Clipboard"
                  content={`name: ${record.name} | record: ${record.record} | type: ${record.type} | ttl: ${
                    record.ttl
                  } | value: ${record.value}${record.priority ? ` | priority: ${record.priority}` : ""}`}
                />
                <Action.CopyToClipboard title="Copy Name to Clipboard" content={record.name} />
                <Action.CopyToClipboard title="Copy Value to Clipboard" content={record.value} />
                <Action.CopyToClipboard title="Copy Type to Clipboard" content={record.type} />
                <Action.CopyToClipboard title="Copy TTL to Clipboard" content={record.ttl} />
                {record.priority && (
                  <Action.CopyToClipboard title="Copy Priority to Clipboard" content={record.priority} />
                )}
                <Action.OpenInBrowser title="View Domain in Dashboard" url={`${RESEND_URL}domains/${newDomain.id}`} />
              </ActionPanel>
            }
            accessories={[
              { tag: record.type },
              { tag: `TTL: ${record.ttl}` },
              { tag: record.priority ? ` Priority: ${record.priority.toString()}` : "" },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
