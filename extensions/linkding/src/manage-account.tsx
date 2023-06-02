import { Action, ActionPanel, Form, List, useNavigation } from "@raycast/api";
import { LinkdingAccountMap, LinkdingForm } from "./types/linkding-types";
import React, { useEffect, useState } from "react";
import { getPersistedLinkdingAccounts, setPersistedLinkdingAccounts } from "./service/user-account-service";

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
    const { [name]: removed, ...filteredMapEntries } = linkdingAccountMap;
    updateLinkdingAccountMap(filteredMapEntries);
  }

  function createUpdateAccount(account: LinkdingForm): void {
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

  function showCreateEditAccount(formValue?: LinkdingForm) {
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
          <Action title="Create New Account" onAction={() => showCreateEditAccount()} />
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
                  <Action title="Create Account" onAction={() => showCreateEditAccount()} />
                  <Action title="Edit Account" onAction={() => showCreateEditAccount({ name, ...linkdingAccount })} />
                  <Action title="Delete Account" onAction={() => deleteAccount(name)} />
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
  initialValue?: LinkdingForm;
  onSubmit: (formValue: LinkdingForm) => void;
  linkdingAccountMap: LinkdingAccountMap;
}) {
  const { pop } = useNavigation();

  const [accountNameError, setAccountNameError] = useState<string | undefined>();
  const [serverUrlError, setServerUrlError] = useState<string | undefined>();
  const [apiKeyError, setApiKeyError] = useState<string | undefined>();

  function submitForm(formValues: LinkdingForm): void {
    onSubmit({
      name: formValues.name?.trim() ?? initialValue?.name,
      apiKey: formValues.apiKey.trim(),
      serverUrl: formValues.serverUrl.trim(),
      ignoreSSL: formValues.ignoreSSL,
    });
    pop();
  }

  function validateAccountname(value?: string) {
    if (value) {
      if (Object.keys(linkdingAccountMap).includes(value)) {
        setAccountNameError("Name already used");
      }
    } else {
      setAccountNameError("Name is required");
    }
  }

  function dropAccountNameError() {
    setAccountNameError(undefined);
  }

  function validateServerUrl(value?: string) {
    if (value) {
      if (!value.includes("http")) {
        setServerUrlError("Server URL must start with 'http/s'");
      }
    } else {
      setServerUrlError("Server URL is required");
    }
  }

  function dropServerUrlError() {
    setServerUrlError(undefined);
  }

  function validateApiKey(value?: string) {
    if (!value) {
      setApiKeyError("API Key is required");
    }
  }

  function dropApiKeyError() {
    setApiKeyError(undefined);
  }

  return (
    <Form
      navigationTitle={initialValue ? `Edit Linkding "${initialValue.name}" Account` : "Create new Linkding Account"}
      actions={
        <ActionPanel title="Manage Accounts">
          <Action.SubmitForm
            title={initialValue ? "Edit Account" : "Create Account"}
            onSubmit={(values: LinkdingForm) => submitForm(values)}
          />
        </ActionPanel>
      }
    >
      {initialValue?.name ? (
        <Form.Description title="Accountname" text="Accountname cant be changed" />
      ) : (
        <Form.TextField
          defaultValue={initialValue?.name}
          id="name"
          error={accountNameError}
          onBlur={(event) => validateAccountname(event.target.value)}
          onChange={dropAccountNameError}
          title="Account Name"
          placeholder="A Name for the Account"
        />
      )}
      <Form.TextField
        defaultValue={initialValue?.serverUrl}
        id="serverUrl"
        error={serverUrlError}
        onBlur={(event) => validateServerUrl(event.target.value)}
        onChange={dropServerUrlError}
        title="Linkding Server URL"
        placeholder="URL from the Linkding instance"
      />
      <Form.PasswordField
        defaultValue={initialValue?.apiKey}
        id="apiKey"
        error={apiKeyError}
        onBlur={(event) => validateApiKey(event.target.value)}
        onChange={dropApiKeyError}
        title="Linkding API Key"
        placeholder="API Key from from the Linkding instance"
      />
      <Form.Checkbox
        defaultValue={initialValue?.ignoreSSL}
        id="ignoreSSL"
        title="Ignore Server SSL"
        label="Ignore SSL Certificate from Linkding Server"
      />
    </Form>
  );
}
