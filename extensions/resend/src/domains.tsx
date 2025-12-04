import { useState } from "react";
import { AddDomainRequestForm } from "./utils/types";
import { Action, ActionPanel, Alert, Form, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { ADD_DOMAIN_REGIONS, DOMAIN_STATUS_COLORS, RESEND_URL } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";
import { onError, useGetDomains } from "./lib/hooks";
import { CreateDomainResponseSuccess, Domain, DomainRegion } from "resend";
import { resend } from "./lib/resend";
import { isApiError } from "./utils/api";

export default function Domains() {
  const { isLoading, domains, error, revalidate, mutate } = useGetDomains();

  async function verifyDomainFromApi(domain: Domain) {
    const toast = await showToast(Toast.Style.Animated, "Verifying Domain", domain.name);

    try {
      await mutate(
        resend.domains.verify(domain.id).then(({ error }) => {
          if (error) throw new Error(error.message, { cause: error.name });
        }),
        {
          optimisticUpdate(data) {
            return data.map((d) => (d.id !== domain.id ? d : { ...d, status: "pending" }));
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "In Progress";
      toast.message = "You will receive an email notification once this operation is completed.";
    } catch (error) {
      onError(error as Error);
    }
  }

  async function confirmAndDelete(item: Domain) {
    if (
      await confirmAlert({
        title: `Delete '${item.name}'?`,
        message: `id: ${item.id}`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Deleting Domain", item.name);
      try {
        await mutate(
          resend.domains.remove(item.id).then(({ error }) => {
            if (error) throw new Error(error.message, { cause: error.name });
          }),
          {
            optimisticUpdate(data) {
              return data.filter((d) => d.id !== item.id);
            },
            shouldRevalidateAfter: false,
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Deleted Domain";
      } catch (error) {
        onError(error as Error);
      }
    }
  }

  const numOfDomains = domains.length;
  const title = `${numOfDomains} ${numOfDomains === 1 ? "domain" : "domains"}`;
  return error && isApiError(error) ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search domain">
      {!isLoading && !domains.length ? (
        <List.EmptyView
          title="No domains yet"
          description="Verify a domain by adding a DNS record and start sending emails from your own address."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Domain"
                icon={Icon.Plus}
                target={<DomainsAdd onDomainAdded={revalidate} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
              <Action title="Reload Domains" icon={Icon.Redo} onAction={revalidate} />
              <Action.OpenInBrowser
                title="View API Reference"
                url={`${RESEND_URL}docs/api-reference/domains/create-domain`}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={title}>
          {domains.map((item) => {
            const region = ADD_DOMAIN_REGIONS.find((region) => region.value === item.region);
            return (
              <List.Item
                key={item.id}
                title={item.name}
                icon={getFavicon(`https://${item.name}`, { fallback: Icon.Globe })}
                subtitle={item.id}
                accessories={[
                  { tag: { value: item.status, color: DOMAIN_STATUS_COLORS[item.status] } },
                  region ? { icon: region.icon, tooltip: region.title } : {},
                  { tag: new Date(item.created_at), tooltip: `Created: ${item.created_at}` },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy ID to Clipboard" content={item.id} />
                    <Action.CopyToClipboard title="Copy Name to Clipboard" content={item.name} />
                    <Action.OpenInBrowser title="View Domain in Dashboard" url={`${RESEND_URL}domains/${item.id}`} />
                    {item.status !== "pending" && (
                      <Action
                        title="Verify Domain"
                        icon={Icon.WrenchScrewdriver}
                        onAction={() => verifyDomainFromApi(item)}
                      />
                    )}
                    <Action
                      title="Delete Domain"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => confirmAndDelete(item)}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                    <ActionPanel.Section>
                      <Action.Push
                        title="Add New Domain"
                        icon={Icon.Plus}
                        target={<DomainsAdd onDomainAdded={revalidate} />}
                        shortcut={Keyboard.Shortcut.Common.New}
                      />
                      <Action title="Reload Domains" icon={Icon.Redo} onAction={revalidate} />
                      <Action.OpenInBrowser
                        title="View API Reference"
                        url={`${RESEND_URL}docs/api-reference/domains/list-domains`}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function DomainsAdd({ onDomainAdded }: { onDomainAdded: () => void }) {
  const [newDomain, setNewDomain] = useState<CreateDomainResponseSuccess>();

  const { handleSubmit, itemProps } = useForm<AddDomainRequestForm>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Processing...", "Adding Domain");
      try {
        const { error, data } = await resend.domains.create({
          name: values.name,
          region: values.region as DomainRegion,
        });
        if (error) throw new Error(error.message, { cause: error.name });
        onDomainAdded();
        setNewDomain(data);
        toast.style = Toast.Style.Success;
        toast.title = "Added Domain";
        toast.message = data.name;
      } catch (error) {
        onError(error as Error);
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return !newDomain ? (
    <Form
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
