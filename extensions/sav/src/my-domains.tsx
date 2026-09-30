import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { headers, parseResponse, useGetActiveDomains } from "./hooks";
import { FormValidation, getFavicon, useCachedState, useFetch, useForm } from "@raycast/utils";
import { ActiveDomain } from "./types";
import { useState } from "react";
import { generateApiUrl } from "./utils";
import fetch from "node-fetch";

export default function MyDomains() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("domains-show-details", false);
  const { isLoading, data: domains, revalidate, mutate } = useGetActiveDomains();

  const toggleAutoRenewal = async (domain: ActiveDomain) => {
    const toast = await showToast(
      Toast.Style.Animated,
      `${domain.auto_renew_enabled === "1" ? "Disabling" : "Enabling"} Auto Renewal`,
      domain.domain_name,
    );
    const enabled = domain.auto_renew_enabled === "1" ? "0" : "1";
    try {
      await mutate(
        fetch(generateApiUrl("update_domain_auto_renewal", { domain_name: domain.domain_name, enabled }), {
          headers,
        }).then((res) => parseResponse(res)),
        {
          optimisticUpdate(data) {
            const index = data.findIndex((d) => d.domain_id === domain.domain_id);
            data[index] = { ...domain, auto_renew_enabled: enabled };
            return data;
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = `${domain.auto_renew_enabled === "1" ? "Disabled" : "Enabled"} Auto Renewal`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${domain.auto_renew_enabled === "1" ? "disable" : "enable"}`;
    }
  };

  const toggleDomainPrivacy = async (domain: ActiveDomain) => {
    const toast = await showToast(
      Toast.Style.Animated,
      `${domain.whois_privacy_enabled === "1" ? "Disabling" : "Enabling"} Domain Privacy`,
      domain.domain_name,
    );
    const enabled = domain.whois_privacy_enabled === "1" ? "0" : "1";
    try {
      await mutate(
        fetch(generateApiUrl("update_domain_privacy", { domain_name: domain.domain_name, enabled }), {
          headers,
        }).then((res) => parseResponse(res)),
        {
          optimisticUpdate(data) {
            const index = data.findIndex((d) => d.domain_id === domain.domain_id);
            data[index] = { ...domain, whois_privacy_enabled: enabled };
            return data;
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = `${domain.whois_privacy_enabled === "1" ? "Disabled" : "Enabled"} Domain Privacy`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not ${domain.whois_privacy_enabled === "1" ? "disable" : "enable"}`;
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {domains.map((domain) => {
        const status = domain.internal_status
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return (
          <List.Item
            key={domain.domain_id}
            icon={getFavicon(`https://${domain.domain_name}`, { fallback: Icon.Globe })}
            title={domain.domain_name}
            subtitle={isShowingDetail ? undefined : status}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    { icon: domain.auto_renew_enabled === "1" ? Icon.Check : Icon.Xmark, text: "Auto Renew" },
                    {
                      icon:
                        domain.whois_privacy_enabled === "1"
                          ? { source: Icon.Lock, tintColor: Color.Green }
                          : Icon.LockDisabled,
                      text: "Whois Privacy",
                    },
                    {
                      date: new Date(+domain.date_expiration * 1000),
                      tooltip: `Expiration Date: ${new Date(+domain.date_expiration * 1000).toDateString()}`,
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={`# Nameservers \n\n ${domain.ns_1} \n\n ${domain.ns_2}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={domain.domain_id} />
                    <List.Item.Detail.Metadata.Label title="Domain" text={domain.domain_name} />
                    <List.Item.Detail.Metadata.Label title="Status" text={status} />
                    <List.Item.Detail.Metadata.Label
                      title="Date Registered"
                      text={new Date(+domain.date_registered * 1000).toDateString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Date Expiring"
                      text={new Date(+domain.date_registered * 1000).toDateString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Auto Renew"
                      text={domain.auto_renew_enabled === "1" ? "Enabled" : "Disabled"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Whois Privacy"
                      text={domain.whois_privacy_enabled === "1" ? "Enabled" : "Disabled"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action.Push
                  icon={Icon.List}
                  title="Update Nameservers"
                  target={<UpdateNameservers domain={domain} onUpdate={revalidate} />}
                />
                {!isLoading && (
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.BankNote}
                      title={`${domain.auto_renew_enabled === "1" ? "Disable" : "Enable"} Auto Renewal`}
                      onAction={() => toggleAutoRenewal(domain)}
                    />
                    <Action
                      icon={Icon.Lock}
                      title={`${domain.whois_privacy_enabled === "1" ? "Disable" : "Enable"} Whois Privacy`}
                      onAction={() => toggleDomainPrivacy(domain)}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function UpdateNameservers({ domain, onUpdate }: { domain: ActiveDomain; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  type FormValues = {
    ns_1: string;
    ns_2: string;
  };
  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      ns_1: FormValidation.Required,
      ns_2: FormValidation.Required,
    },
    initialValues: {
      ns_1: domain.ns_1,
      ns_2: domain.ns_2,
    },
  });

  const { isLoading } = useFetch(
    generateApiUrl("update_domain_nameservers", { domain_name: domain.domain_name, ...values }),
    {
      headers,
      parseResponse,
      execute,
      onData() {
        onUpdate();
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
          <Action.SubmitForm icon={Icon.Check} title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain.domain_name} />
      <Form.Separator />
      <Form.TextField title="Nameserver 1" placeholder="Name Server 1" {...itemProps.ns_1} />
      <Form.TextField title="Nameserver 2" placeholder="Name Server 2" {...itemProps.ns_2} />
      <Form.Description text="Changes typically happen within a few hours but may take up to 2 days." />
    </Form>
  );
}
