import { Action, ActionPanel, Form, Icon, List, showToast, useNavigation } from "@raycast/api";
import { useListDomains, useListFTPAccountsWithDiskInformation, useUAPI } from "./lib/hooks";
import { isInvalidUrl } from "./lib/utils";
import InvalidUrl from "./lib/components/invalid-url";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import { useState } from "react";
import { DEFAULT_ICON } from "./lib/constants";

export default function FTPAccounts() {
  if (isInvalidUrl()) return <InvalidUrl />;

  const { isLoading, data, revalidate } = useListFTPAccountsWithDiskInformation();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search ftp account" isShowingDetail>
      {data?.map((account) => (
        <List.Item
          key={account.user}
          title={account.user}
          icon={account.type === "logaccess" ? Icon.Document : Icon.Person}
          detail={
            <List.Item.Detail
              markdown={account.dir}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Disk Used"
                    text={`${account.humandiskused} / ${account.humandiskquota} (${account.diskusedpercent}%)`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Deleteable"
                    icon={account.deleteable ? Icon.Check : Icon.Xmark}
                  />
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={account.type} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Create FTP Account"
                target={<CreateFTPAccount onAccountCreated={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateFTPAccount({ onAccountCreated }: { onAccountCreated: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  type FormValues = {
    user: string;
    disallowdot: boolean;
    domain: string;
    pass: string;
  };

  const { isLoading: isLoadingDomains, data: domains } = useListDomains();

  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      domain: domains?.main_domain || "",
      disallowdot: true,
    },
    validation: {
      user: FormValidation.Required,
      pass(value) {
        if (!value) return "The item is required";
        else if (value.length < 5) return "Your password must contain at least 5 characters";
      },
    },
  });

  const { isLoading: isCreating } = useUAPI<string>(
    "Ftp",
    "add_ftp",
    { ...values, disallowdot: +values.disallowdot },
    {
      execute,
      onError() {
        setExecute(false);
      },
      async onData() {
        await showToast({
          title: `Created ftp account`,
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
      <Form.TextField title="Log In" placeholder="The new FTP account username" {...itemProps.user} />
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
      <Form.Description text={`${values.user || "<USER>"}@${values.domain}`} />
      <Form.PasswordField title="Password" placeholder="Enter Password" {...itemProps.pass} />
      <Form.Checkbox label="Whether to strip dots (.) from the username" {...itemProps.disallowdot} />
    </Form>
  );
}
