import { showToast, Toast, ActionPanel, popToRoot, Clipboard, Action, Form } from "@raycast/api";

import { generatePassword, parseImprovMXResponse } from "./utils";
import { useImprovMX } from "./hooks";
import { Account, Domain } from "./types";
import ErrorComponent from "./components/ErrorComponent";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL } from "./constants";

export default function createSMTPCredentials() {
  const {
    isLoading: isFetchingDomains,
    data: domainsData,
    error: domainsError,
  } = useImprovMX<{ domains: Domain[] }>("domains");
  const {
    isLoading: isFetchingAccount,
    data: accountData,
    error: accountError,
  } = useImprovMX<{ account: Account }>("account");

  type FormValues = {
    domain: string;
    username: string;
    password: string;
    onlyFromAlias: string;
  };
  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      create();
    },
    initialValues: {
      password: generatePassword(),
    },
    validation: {
      domain: FormValidation.Required,
      username: FormValidation.Required,
      password(value) {
        if (!value) return "The item is required";
        else if (value.length < 8) return "The item must be at least 8 characters";
      },
      onlyFromAlias: FormValidation.Required,
    },
  });

  type CreateSMTPResponse = {
    credential: {
      created: number;
      usage: number;
      username: string;
    };
    requires_new_mx_check: boolean;
    success: true;
  };
  const {
    isLoading: isCreating,
    error: createError,
    revalidate: create,
  } = useFetch(API_URL + `domains/${values.domain}/credentials`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      username: values.username,
      password: values.password,
      is_limited: values.onlyFromAlias,
    }),
    execute: false,
    async parseResponse(response) {
      return parseImprovMXResponse<CreateSMTPResponse>(response, { pagination: false });
    },
    mapResult(result) {
      return {
        data: result.data,
      };
    },
    async onData() {
      await Clipboard.copy(values.password);
      await showToast(Toast.Style.Success, "SMTP Credentials Created", "Password copied to clipboard");
      await popToRoot({
        clearSearchBar: true,
      });
    },
  });
  const isLoading = isFetchingDomains || isFetchingAccount || isCreating;
  const error = domainsError || accountError || createError;
  const isPremium = accountData?.account.premium;

  return error ? (
    <ErrorComponent error={error} />
  ) : !isPremium ? (
    <ErrorComponent
      error={{ name: "", message: "You are currently on a free plan. Please upgrade to create SMTP credentials." }}
      showUpgradeAction
    />
  ) : (
    <Form
      navigationTitle={JSON.stringify(accountData)}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Alias" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" placeholder="Select a domain" {...itemProps.domain}>
        {domainsData?.domains
          .filter((domain) => !domain.banned && domain.active)
          .map((domain) => <Form.Dropdown.Item key={domain.display} value={domain.display} title={domain.display} />)}
      </Form.Dropdown>
      <Form.TextField title="Username" placeholder="Username" {...itemProps.username} />
      <Form.PasswordField title="Password" placeholder="Password" {...itemProps.password} />
      <Form.Dropdown title="Send from any alias" placeholder="Select an option" {...itemProps.onlyFromAlias}>
        <Form.Dropdown.Item value="true" title="Only from this alias" />
        <Form.Dropdown.Item value="false" title="From any alias on that domain" />
      </Form.Dropdown>
    </Form>
  );
}
