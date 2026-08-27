import { FormValidation, getFavicon, useCachedPromise, useForm } from "@raycast/utils";
import { createDomain, getDomains } from "./utils/api";
import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { DomainCreate, FormDomainCreate } from "./utils/types";
import { useState } from "react";

export default function Domains() {
  const {
    isLoading,
    data: domains = [],
    mutate,
  } = useCachedPromise(async () => {
    const response = await getDomains();
    if (!("error" in response)) return response.domains;
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {!domains.length ? (
        <List.EmptyView
          title="Welcome! Let's Email!"
          description="To get started, you will need a domain name. Email is tightly integrated with DNS so full control of domain's DNS is required in order to get email active."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Setup My First Email Domain" target={<AddDomain />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${domains.length} ${domains.length === 1 ? "rewrite" : "domains"}`}>
          {domains.map((domain) => (
            <List.Item
              key={domain.name}
              icon={getFavicon(`https://${domain.name}`, { fallback: "migadu.png" })}
              title={domain.name}
              accessories={[
                {
                  icon: {
                    source: Icon.Dot,
                    tintColor:
                      domain.state === "inactive" ? Color.Orange : domain.state === "active" ? Color.Green : undefined,
                  },
                  tooltip: domain.state,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={domain.description}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={domain.name} />
                      <List.Item.Detail.Metadata.TagList title="State">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={domain.state}
                          color={
                            domain.state === "inactive"
                              ? Color.Orange
                              : domain.state === "active"
                                ? Color.Green
                                : undefined
                          }
                        />
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Plus} title="New Domain" target={<AddDomain />} onPop={mutate} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function AddDomain() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<FormDomainCreate>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Creating Domain", values.name);
      const newDomain: DomainCreate = { ...values, hosted_dns: values.hosted_dns === "true" };
      const response = await createDomain(newDomain);
      if (!("error" in response)) {
        toast.style = Toast.Style.Success;
        toast.title = "Created Domain";
        pop();
      }
      setIsLoading(false);
    },
    initialValues: {
      hosted_dns: "false",
      create_default_addresses: true,
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Email Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Domain name"
        placeholder="e.g. mydomain.com"
        info='The domain name is the part after the "@" symbol in email addresses. You most likely do not want the www subdomain there, though it is allowed.'
        {...itemProps.name}
      />
      <Form.Dropdown
        title="DNS Nameservers"
        info="Email is tightly integrated with Domain Name System (DNS) which means some changes are required in your DNS records."
        {...itemProps.hosted_dns}
      >
        <Form.Dropdown.Item title="Use external nameservers (commmon choice)" value="false" />
        <Form.Dropdown.Item title="Use Migadu nameservers" value="true" />
      </Form.Dropdown>
      <Form.Checkbox
        title="Default Email Addresses"
        label="Create default addresses"
        info="According to email standards, some addresses (admin, postmaster, abuse) must exist on your domain. We recommend adding these right away."
        {...itemProps.create_default_addresses}
      />
      <Form.Separator />
      <Form.Description
        title="⚠️"
        text="Please make sure you enter a valid domain as Migadu seems to block requests after consecutive invalid attempts"
      />
    </Form>
  );
}
