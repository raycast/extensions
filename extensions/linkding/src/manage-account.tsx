import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { LinkdingAccountForm, LinkdingAccountMap } from "./types/linkding-types";
import { useEffect, useState } from "react";
import { getPersistedLinkdingAccounts, setPersistedLinkdingAccounts } from "./service/user-account-service";
import { validateUrl } from "./util/bookmark-util";
import { LinkdingShortcut } from "./types/linkding-shortcuts";
import { useForm } from "@raycast/utils";

export default function ManageAccounts() {
  const [linkdingAccountMap, setLinkdingAccountMap] = useState<LinkdingAccountMap>({});
  const [searchText, setSearchText] = useState("");
  const [hasAccounts, setHasAccounts] = useState(false);
  const { push } = useNavigation();
  useEffect(() => {
    getPersistedLinkdingAccounts().then((linkdingMap) => {
      if (linkdingMap) {
        setHasAccounts(Object.keys(linkdingMap).length > 0);
        const searchedLinkdingAccounts = Object.keys(linkdingMap)
          .filter((account) => searchText === "" || account.includes(searchText))
          .reduce((prev, account) => ({ ...prev, [account]: linkdingMap[account] }), {});
        setLinkdingAccountMap(searchedLinkdingAccounts);
      }
    });
  }, [setLinkdingAccountMap, searchText]);

  function deleteAccount(name: string): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [name]: removed, ...filteredMapEntries } = linkdingAccountMap;
    updateLinkdingAccountMap(filteredMapEntries);
  }

  function createUpdateAccount(account: LinkdingAccountForm): void {
    const { name, ...linkdingServer } = account;
    if (name) {
      const accounts = { ...linkdingAccountMap, [name]: { ...linkdingServer } };
      updateLinkdingAccountMap(accounts);
    }
  }

  function updateLinkdingAccountMap(linkdingMap: LinkdingAccountMap) {
    setLinkdingAccountMap(linkdingMap);
    setPersistedLinkdingAccounts(linkdingMap);
  }

  function showCreateEditAccount(formValue?: LinkdingAccountForm) {
    push(
      <CreateEditAccount
        initialValue={formValue}
        linkdingAccountMap={linkdingAccountMap}
        onSubmit={(formValue) => createUpdateAccount(formValue)}
      />
    );
  }

  return (
    <List
      navigationTitle="Manage Linkding Accounts"
      searchBarPlaceholder="Search through Accounts..."
      onSearchTextChange={setSearchText}
      throttle
      actions={
        <ActionPanel title="Manage Accounts">
          <Action icon={Icon.Plus} title="Create New Account" onAction={() => showCreateEditAccount()} />
        </ActionPanel>
      }
    >
      {Object.keys(linkdingAccountMap).length == 0 && !hasAccounts ? (
        <List.EmptyView
          title="Your Linkding Account is not set up yet."
          description="Here, you can create your first account."
        />
      ) : (
        Object.entries(linkdingAccountMap).map(([name, linkdingAccount]) => {
          return (
            <List.Item
              key={name}
              title={name}
              subtitle={linkdingAccount.serverUrl}
              actions={
                <ActionPanel title="Manage Accounts">
                  <Action icon={Icon.Plus} title="Create Account" onAction={() => showCreateEditAccount()} />
                  <Action
                    icon={Icon.Pencil}
                    title="Edit Account"
                    onAction={() => showCreateEditAccount({ name, ...linkdingAccount })}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Account"
                    shortcut={LinkdingShortcut.DELETE_SHORTCUT}
                    onAction={() => deleteAccount(name)}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function CreateEditAccount({
  initialValue,
  onSubmit,
  linkdingAccountMap,
}: {
  initialValue?: LinkdingAccountForm;
  onSubmit: (formValue: LinkdingAccountForm) => void;
  linkdingAccountMap: LinkdingAccountMap;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<LinkdingAccountForm>({
    onSubmit(values) {
      const url = new URL(values.serverUrl).toString();
      const serverUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      onSubmit({
        name: values.name?.trim() ?? initialValue?.name,
        apiKey: values.apiKey.trim(),
        serverUrl,
        ignoreSSL: values.ignoreSSL,
      });
      pop();
    },
    initialValues: initialValue,
    validation: {
      name(value) {
        if (initialValue?.name) return undefined;
        if (!value) return "Name is required";
        if (Object.keys(linkdingAccountMap).includes(value)) return "Name already used";
      },
      serverUrl(value) {
        if (!value) return "Server URL is required";
        if (!validateUrl(value)) return "Server URL must be a valid url";
      },
      apiKey(value) {
        if (!value) return "API Key is required";
      },
    },
  });

  return (
    <Form
      navigationTitle={initialValue ? `Edit Linkding "${initialValue.name}" Account` : "Create new Linkding Account"}
      actions={
        <ActionPanel title="Manage Accounts">
          <Action.SubmitForm title={initialValue ? "Edit Account" : "Create Account"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {initialValue?.name ? (
        <Form.Description title="Account Name" text="Account Name can't be changed" />
      ) : (
        <Form.TextField title="Account Name" placeholder="A Name for the Account" {...itemProps.name} />
      )}
      <Form.TextField
        title="Linkding Server URL"
        placeholder="URL from the Linkding instance"
        {...itemProps.serverUrl}
      />
      <Form.PasswordField
        title="Linkding API Key"
        placeholder="API Key from from the Linkding instance"
        {...itemProps.apiKey}
      />
      <Form.Checkbox
        title="Ignore Server SSL"
        label="Ignore SSL Certificate from Linkding Server"
        {...itemProps.ignoreSSL}
      />
    </Form>
  );
}
