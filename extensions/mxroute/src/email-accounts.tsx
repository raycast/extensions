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

export default function EmailAccounts({
  selectedDomainName,
  domains,
}: {
  selectedDomainName: string;
  domains: Domain[];
}) {
  const [domain, setDomain] = useState(selectedDomainName);
  const {
    isLoading,
    data: accounts,
    mutate,
  } = useCachedPromise(
    async (domain: string) => {
      const accounts = await mxroute.domains.accounts.list(domain);
      return accounts;
    },
    [domain],
    {
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search email accounts"
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
      {!isLoading && !accounts.length ? (
        <List.EmptyView
          icon="📨"
          title="No email accounts found for this domain."
          description={`"Add New Email Account" below`}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add New Email Account"
                target={<AddEmailAccount domain={domain} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        accounts.map((account) => (
          <List.Item
            key={account.username}
            icon={Icon.Envelope}
            title={account.username}
            subtitle={account.email}
            accessories={[
              { text: `${account.usage}${account.quota ? ` / ${account.quota} MB` : " MB"}`, tooltip: "Usage" },
              {
                tag: account.suspended
                  ? { value: "Suspended", color: Color.Red }
                  : { value: "Active", color: Color.Green },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add New Email Account"
                  target={<AddEmailAccount domain={domain} />}
                  onPop={mutate}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Email Account"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: "Delete Email Account",
                      message: `Are you sure you want to delete ${account.email}?`,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", account.email);
                          try {
                            await mutate(mxroute.domains.accounts.delete(domain, account.username), {
                              optimisticUpdate(data) {
                                return data.filter((e) => e.username !== account.username);
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

function AddEmailAccount({ domain }: { domain: string }) {
  type FormValues = {
    username: string;
    password: string;
    quota: string;
    limit: string;
  };
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.username);
      try {
        await mxroute.domains.accounts.create(domain, {
          ...values,
          quota: Number(values.quota),
          limit: Number(values.limit),
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
    initialValues: {
      quota: "1024",
      limit: "9600",
    },
    validation: {
      username: FormValidation.Required,
      password: FormValidation.Required,
      quota(value) {
        if (!value) return "The item is required";
        const num = Number(value);
        if (isNaN(num) || num < 0) return "Must be 0 or greater";
      },
      limit(value) {
        if (!value) return "The item is required";
        const num = Number(value);
        if (isNaN(num) || num < 0) return "Must be 0 or greater";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Username"
        placeholder="username"
        info="Local part of email (the part before @)"
        {...itemProps.username}
      />
      <Form.Description text={`@${domain}`} />
      <Form.PasswordField title="Password" placeholder="Minimum 6 characters" {...itemProps.password} />
      <Form.TextField title="Quota (MB)" info="0 for unlimited" {...itemProps.quota} />
      <Form.TextField title="Send Limit/Day" info="Max 9600/day (400/hr)" {...itemProps.limit} />
    </Form>
  );
}
