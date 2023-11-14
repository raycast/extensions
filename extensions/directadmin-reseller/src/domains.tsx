import { useEffect, useState } from "react";
import {
  changeEmailAccountPassword,
  createEmailAccount,
  createSubdomain,
  deleteEmailAccount,
  deleteSubdomain,
  getDomains,
  getEmailAccounts,
  getSubdomains,
} from "./utils/api";
import {
  ChangeEmailAccountPasswordRequest,
  CreateEmailAccountFormValues,
  CreateEmailAccountRequest,
  CreateSubdomainFormValues,
  GetDomainsResponse,
  GetEmailAccountsResponse,
  SuccessResponse,
} from "./types";
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
import CreateNewDomainComponent from "./components/CreateNewDomainComponent";

export default function Domains() {
  const [isLoading, setIsLoading] = useState(true);
  const [domains, setDomains] = useState<string[]>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getDomains();

    if (response.error === "0") {
      const data = response as GetDomainsResponse;
      const { list } = data;
      setDomains(list);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Domains`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return (
    <List isLoading={isLoading}>
      {domains &&
        domains.map((domain) => (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Get Subdomains"
                  icon={Icon.Globe}
                  target={<GetSubdomains domain={domain} />}
                />
                <Action.Push
                  title="Get Email Accounts"
                  icon={Icon.AtSymbol}
                  target={<GetEmailAccounts domain={domain} />}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Domain"
                    icon={Icon.Plus}
                    target={<CreateNewDomainComponent onDomainCreated={getFromApi} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Domain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Domain"
                  icon={Icon.Plus}
                  target={<CreateNewDomainComponent onDomainCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

// CreateNewDomain was here

type GetSubdomainsProps = {
  domain: string;
};
function GetSubdomains({ domain }: GetSubdomainsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [subdomains, setSubdomains] = useState<string[]>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getSubdomains(domain);
    if (response.error === "0") {
      // this endpoint returns nothing if no subdomains so we handle it
      const list = "list" in response ? (response.list as string[]) : [];
      setSubdomains(list);

      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Subdomains`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDeleteSubdomain(subdomain: string) {
    if (
      await confirmAlert({
        title: `Delete subdomain '${subdomain}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      let removeContents = false;
      if (
        await confirmAlert({
          title: "Remove directory and contents?",
          icon: Icon.QuestionMark,
          primaryAction: { title: "Yes" },
          dismissAction: { title: "No" },
        })
      )
        removeContents = true;

      const response = await deleteSubdomain({
        action: "delete",
        domain,
        select0: subdomain,
        contents: removeContents ? "yes" : "no",
      });
      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        await getFromApi();
      }
    }
  }

  return (
    <List navigationTitle="Get Subdomains" isLoading={isLoading}>
      {subdomains &&
        subdomains.map((subdomain) => (
          <List.Item
            key={subdomain}
            title={subdomain}
            subtitle={`.${domain}`}
            icon={getFavicon(`https://${subdomain}.${domain}`, { fallback: Icon.Globe })}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Subdomain"
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDeleteSubdomain(subdomain)}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Create Subdomain"
                    icon={Icon.Plus}
                    target={<CreateSubdomain domain={domain} onSubdomainCreated={getFromApi} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create Subdomain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Subdomain"
                  icon={Icon.Plus}
                  target={<CreateSubdomain domain={domain} onSubdomainCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type CreateSubdomainProps = {
  domain: string;
  onSubdomainCreated: () => void;
};
function CreateSubdomain({ domain, onSubdomainCreated }: CreateSubdomainProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateSubdomainFormValues>({
    async onSubmit(values) {
      const { subdomain } = values;
      const response = await createSubdomain({ subdomain, domain, action: "create" });

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onSubdomainCreated();
        pop();
      }
    },
    validation: {
      subdomain: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Create Subdomain"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.TextField title="Subdomain" placeholder="dash" {...itemProps.subdomain} />
      <Form.Description text={`${itemProps.subdomain.value}.${domain}`} />
    </Form>
  );
}

type GetEmailAccountsProps = {
  domain: string;
};
export function GetEmailAccounts({ domain }: GetEmailAccountsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [emailAccounts, setEmailAccounts] = useState<string[]>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getEmailAccounts({ domain, action: "list" });
    if (response.error === "0") {
      const data = response as GetEmailAccountsResponse;
      const list = data?.list || [];
      setEmailAccounts(list);
      await showToast(Toast.Style.Success, "SUCCESS", `Fetched ${list.length} Email Accounts`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDeleteEmailAccount(email: string) {
    if (
      await confirmAlert({
        title: `Delete email account '${email}@${domain}'?`,
        message: "This action cannot be undone.",
        icon: { source: Icon.DeleteDocument, tintColor: Color.Red },
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteEmailAccount({ action: "delete", domain, user: email });
      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        await getFromApi();
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Email Accounts">
      {emailAccounts &&
        (emailAccounts.length === 0 ? (
          <List.EmptyView
            actions={
              <ActionPanel>
                <Action.Push
                  title="Create Email Account"
                  icon={Icon.Plus}
                  target={<CreateEmailAccount domain={domain} onEmailAccountCreated={getFromApi} />}
                />
              </ActionPanel>
            }
          />
        ) : (
          emailAccounts.map((email) => (
            <List.Item
              key={email}
              title={email}
              icon={Icon.AtSymbol}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Change Password"
                    icon={Icon.Key}
                    target={<ChangeEmailAccountPassword email={email} onEmailAccountPasswordChanged={getFromApi} />}
                  />
                  <Action
                    title="Delete Email Account"
                    style={Action.Style.Destructive}
                    icon={Icon.DeleteDocument}
                    onAction={() => confirmAndDeleteEmailAccount(email)}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create Email Account"
                      icon={Icon.Plus}
                      target={<CreateEmailAccount domain={domain} onEmailAccountCreated={getFromApi} />}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        ))}
      {/* {emailAccounts && emailAccounts.map(email => <List.Item key={email} title={email} icon={Icon.AtSymbol} actions={<ActionPanel>
            <ActionPanel.Section>
                <Action.Push title="Create Email Account" icon={Icon.Plus} target={<CreateEmailAccount domain={domain} onEmailAccountCreated={getFromApi} />} />
                <Action.Push title="Set Password" icon={Icon.Key} target={<ChangeEmailAccountPassword domain={domain} onEmailAccountPasswordChanged={getFromApi} />} />
            </ActionPanel.Section>
        </ActionPanel>} />)} */}
    </List>
  );
}

type ChangeEmailAccountPasswordProps = {
  email: string;
  onEmailAccountPasswordChanged: () => void;
};
function ChangeEmailAccountPassword({ email, onEmailAccountPasswordChanged }: ChangeEmailAccountPasswordProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChangeEmailAccountPasswordRequest>({
    async onSubmit(values) {
      const response = await changeEmailAccountPassword({ ...values, email });

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onEmailAccountPasswordChanged();
        pop();
      }
    },
    validation: {
      oldpassword: FormValidation.Required,
      password1(value) {
        if (!value) return "The item is required";
        else if (itemProps.password2.value && itemProps.password2.value !== value) return "Passwords do not match";
      },
      password2(value) {
        if (!value) return "The item is required";
        else if (itemProps.password1.value && itemProps.password1.value !== value) return "Passwords do not match";
      },
    },
  });

  return (
    <Form
      navigationTitle="Change Email Account Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Email" text={email} />
      <Form.PasswordField title="Old Password" placeholder="hunter1" {...itemProps.oldpassword} />
      <Form.PasswordField title="New Password" placeholder="hunter2" {...itemProps.password1} />
      <Form.PasswordField title="Repeat New Password" placeholder="hunter2" {...itemProps.password2} />
    </Form>
  );
}

type CreateEmailAccountProps = {
  domain: string;
  onEmailAccountCreated: () => void;
};
function CreateEmailAccount({ domain, onEmailAccountCreated }: CreateEmailAccountProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateEmailAccountFormValues>({
    async onSubmit(values) {
      const body = {
        ...values,
        quota: Number(values.quota),
        limit: Number(values.limit),
        action: "create",
        domain,
      } as CreateEmailAccountRequest;
      if (!values.limit) delete body.limit;

      const response = await createEmailAccount(body);

      if (response.error === "0") {
        const data = response as SuccessResponse;
        await showToast(Toast.Style.Success, data.text, data.details);
        onEmailAccountCreated();
        pop();
      }
    },
    validation: {
      user: FormValidation.Required,
      passwd(value) {
        if (!value) return "The item is required";
        else if (itemProps.passwd2.value && itemProps.passwd2.value !== value) return "Passwords do not match";
      },
      passwd2(value) {
        if (!value) return "The item is required";
        else if (itemProps.passwd.value && itemProps.passwd.value !== value) return "Passwords do not match";
      },
      quota(value) {
        if (!value) return "The item is required";
        else if (!Number(value) || Number(value) < 0) return "The item must be a number > -1";
      },
      limit(value) {
        if (value) if (!Number(value) || Number(value) < 0) return "The item must be a number > -1";
      },
    },
  });

  return (
    <Form
      navigationTitle="Create Email Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.TextField title="User" placeholder="user" {...itemProps.user} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.passwd} />
      <Form.PasswordField title="Repeat Password" placeholder="hunter2" {...itemProps.passwd2} />
      <Form.TextField title="Quota (MB)" placeholder="0 = Unlimited" {...itemProps.quota} />
      <Form.TextField title="Limit" placeholder="0 = Unlimited | Blank for Default" {...itemProps.limit} />
    </Form>
  );
}
