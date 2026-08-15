import { Action, ActionPanel, Color, Detail, Form, Icon, Keyboard, List, showToast, useNavigation } from "@raycast/api";
import { useListDomains, useListEmailAccounts, useListEmailAccountsWithDiskInfo, useUAPI } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";
import { getFavicon, useForm } from "@raycast/utils";
import { useState } from "react";
import { DEFAULT_ICON } from "./lib/constants";

export default function EmailAccounts() {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { isLoading, data, revalidate } = useListEmailAccounts();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search email account">
      {data?.map((account) => {
        const isMainAccount = account.login === "Main Account";
        return (
          <List.Item
            key={account.email}
            title={account.email}
            icon={{ source: isMainAccount ? DEFAULT_ICON : Icon.Envelope }}
            subtitle={account.login}
            accessories={[
              { tag: { value: "INCOMING", color: account.suspended_incoming ? Color.Red : Color.Green } },
              { tag: { value: "LOGIN", color: account.suspended_login ? Color.Red : Color.Green } },
            ]}
            actions={
              <ActionPanel>
                {!isMainAccount && (
                  <Action.Push
                    title="View Disk Information"
                    target={<ViewEmailAccountDiskInformation emailAccount={account.email} />}
                    icon={Icon.Coin}
                  />
                )}
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Create Email Account"
                    target={<CreateEmailAccount onAccountCreated={revalidate} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ViewEmailAccountDiskInformation({ emailAccount }: { emailAccount: string }) {
  const email = emailAccount.split("@")[0];
  const domain = emailAccount.split("@")[1];

  const { isLoading, data } = useListEmailAccountsWithDiskInfo(email, domain);
  const account = data && data[0];

  const markdown = !account
    ? undefined
    : `User: ${account.user} \n\n Domain: ${account.domain} \n\n Email: ${account.email} \n\n---\n\n Disk Used: ${account.humandiskused} of ${account.humandiskquota} (${account.diskusedpercent20}%)`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        !account ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Disk Quota (bytes)"
              text={account._diskquota || ""}
              icon={!account._diskquota ? Icon.Minus : undefined}
            />
            <Detail.Metadata.Label title="Disk Used (bytes)" text={account._diskused.toString()} />
            <Detail.Metadata.Label title="Disk Used (float)" text={`${account.diskusedpercent_float}`} />
            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Disk Quota (MB)" text={account.diskquota} />
            <Detail.Metadata.Label title="Disk Used (MB)" text={account.diskused.toString()} />
            <Detail.Metadata.Label title="Disk Used (percent)" text={`${account.diskusedpercent}%`} />

            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Modified" text={new Date(account.mtime * 1000).toString()} />
            <Detail.Metadata.Label title="Hold Outgoing" icon={account.hold_outgoing ? Icon.Check : Icon.Multiply} />
            <Detail.Metadata.TagList title="Restrictions">
              <Detail.Metadata.TagList.Item text="Login" color={!account.suspended_login ? Color.Green : Color.Red} />
              <Detail.Metadata.TagList.Item
                text="Outgoing"
                color={!account.suspended_outgoing ? Color.Green : Color.Red}
              />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
    />
  );
}

function CreateEmailAccount({ onAccountCreated }: { onAccountCreated: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  type FormValues = {
    email: string;
    domain: string;
    password: string;
    quota: string;
    send_welcome_email: boolean;
    skip_update_db: boolean;
  };

  const { isLoading: isLoadingDomains, data: domains } = useListDomains();

  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      domain: domains?.main_domain || "",
      quota: "250",
      send_welcome_email: true,
      skip_update_db: false,
    },
    validation: {
      email(value) {
        if (!value) return "The item is required";
        else if (value === "cpanel") return "The item must not be 'cpanel'";
      },
      password(value) {
        if (!value) return "The item is required";
        else if (value.length < 5) return "Your password must contain at least 5 characters";
      },
      quota(value) {
        if (!value) return "The item is required";
        else if (!Number(value)) return "The item must be a number";
        else if (Number(value) < 0) return "The item must be >= 0";
      },
    },
  });

  const { isLoading: isCreating } = useUAPI<string>(
    "Email",
    "add_pop",
    { ...values, send_welcome_email: values.send_welcome_email ? 1 : 0, skip_update_db: values.skip_update_db ? 1 : 0 },
    {
      execute,
      onError() {
        setExecute(false);
      },
      async onData(data) {
        await showToast({
          title: `Created email account`,
          message: data,
        });
        onAccountCreated();
        pop();
      },
    },
  );

  const isLoading = isLoadingDomains || isCreating;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Username" placeholder="Enter your email address's username here" {...itemProps.email} />
      <Form.Dropdown title="Domain" {...itemProps.domain}>
        {domains &&
          Object.values(domains)
            .flat()
            .map((domain) => (
              <List.Dropdown.Item
                key={domain}
                icon={getFavicon(`https://${domain}`, { fallback: DEFAULT_ICON })}
                title={domain}
                value={domain}
              />
            ))}
      </Form.Dropdown>
      <Form.Description text={`${values.email || "<USER>"}@${values.domain}`} />
      <Form.PasswordField title="Password" placeholder="Enter Password" {...itemProps.password} />
      <Form.Separator />

      <Form.Description text="Optional Settings" />
      <Form.TextField title="Storage Space (MB)" placeholder="0 for unlimited" {...itemProps.quota} />
      <Form.Checkbox
        label="Send a welcome email with instructions to set up a mail client"
        {...itemProps.send_welcome_email}
      />
      <Form.Checkbox label="Skip the update of the email accounts database's cache" {...itemProps.skip_update_db} />
    </Form>
  );
}
