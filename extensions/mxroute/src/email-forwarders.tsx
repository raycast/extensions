import { FormValidation, getFavicon, useCachedPromise, useForm } from "@raycast/utils";
import { Domain } from "./types";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { mxroute } from "./mxroute";

export default function EmailForwarders({
  selectedDomainName,
  domains,
}: {
  selectedDomainName: string;
  domains: Domain[];
}) {
  const [domain, setDomain] = useState(selectedDomainName);
  const {
    isLoading,
    data: forwarders,
    mutate,
  } = useCachedPromise(
    async (domain: string) => {
      const forwarders = await mxroute.domains.forwarders.list(domain);
      return forwarders;
    },
    [domain],
    {
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search forwarders"
      searchBarAccessory={
        <List.Dropdown tooltip="Domain" onChange={setDomain} value={domain}>
          {domains.map((domain) => (
            <List.Dropdown.Item
              key={domain.domain}
              icon={getFavicon(`https://${domain.domain}`, { fallback: Icon.Globe })}
              title={domain.domain}
              value={domain.domain}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && !forwarders.length ? (
        <List.EmptyView icon="📨" title="No email forwarders found for this domain." />
      ) : (
        forwarders.map((forwarder) => (
          <List.Item
            key={forwarder.alias}
            icon={Icon.Forward}
            title={forwarder.email}
            accessories={[
              forwarder.destinations[0] === ":fail:"
                ? { tag: { value: "Reject", color: Color.Red } }
                : forwarder.destinations[0] === ":blackhole:"
                  ? { tag: { value: "Discard Silently", color: Color.Yellow } }
                  : { tag: { value: forwarder.destinations[0], color: Color.Blue } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add New Email Forwarder"
                  target={<AddEmailForwarder domain={domain} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Email Forwarder"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: "Delete Email Forwarder",
                      message: `Are you sure you want to delete ${forwarder.email}?`,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", forwarder.email);
                          try {
                            await mutate(mxroute.domains.forwarders.delete(domain, forwarder.alias), {
                              optimisticUpdate(data) {
                                return data.filter((f) => f.alias !== forwarder.alias);
                              },
                              shouldRevalidateAfter: false,
                            });
                            toast.style = Toast.Style.Success;
                            toast.title = "Deleted";
                          } catch (error) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = `${error}`;
                          }
                        },
                      },
                    })
                  }
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddEmailForwarder({ domain }: { domain: string }) {
  type FormValues = {
    alias: string;
    type: string;
    destinations: string;
  };
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.alias);
      try {
        const { alias, type } = values;
        const destinations =
          type === "address"
            ? values.destinations
                .split(/[,\n]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            : type === "fail"
              ? [":fail:"]
              : [":blackhole:"];
        await mxroute.domains.forwarders.create(domain, {
          alias,
          destinations,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      alias: FormValidation.Required,
      destinations(value) {
        if (values.type === "address" && !value) return "The item is required";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Forwarder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Note: Forwarding to Yahoo, AOL, Gmail, and similar providers will automatically enable Expert Spam Filtering for the domain to protect your sending reputation." />
      <Form.TextField
        title="Forwarder Name"
        placeholder="alias"
        info="Local part of forwarder address (the part before @)"
        {...itemProps.alias}
      />
      <Form.Description text={`@${domain}`} />

      <Form.Dropdown title="Destination Type" {...itemProps.type}>
        <Form.Dropdown.Item title="Forward to Email(s)" value="address" />
        <Form.Dropdown.Item title="Reject" value="fail" />
        <Form.Dropdown.Item title="Discard Silently" value="blackhole" />
      </Form.Dropdown>
      {values.type === "address" && (
        <Form.TextArea
          title="Recipients"
          placeholder="Enter email addresses (one per line or comma-separated)"
          {...itemProps.destinations}
        />
      )}
    </Form>
  );
}
