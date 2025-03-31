import { showToast, Toast, ActionPanel, Clipboard, Action, Form, LaunchProps, popToRoot, Icon } from "@raycast/api";
import { parseImprovMXResponse } from "./utils";
import { Account, Alias, Domain } from "./types";
import { FormValidation, getFavicon, useFetch, useForm } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";
import { API_HEADERS, API_URL } from "./constants";
import { useImprovMX } from "./hooks";

interface DomainArgs {
  domain: string;
}

export default function createAlias(props: LaunchProps<{ arguments: DomainArgs }>) {
  const propDomain = props.arguments.domain;

  const { isLoading: isFetchingDomains, data, error: domainsError } = useImprovMX<{ domains: Domain[] }>("domains");
  const {
    isLoading: isFetchingAccount,
    data: accountData,
    error: accountError,
  } = useImprovMX<{ account: Account }>("account");

  type FormValues = {
    domain: string;
    alias: string;
    forward: string;
  };
  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      create();
    },
    initialValues: {
      domain: propDomain,
      forward: accountData?.account.email,
    },
    validation: {
      domain: FormValidation.Required,
      alias: FormValidation.Required,
      forward: FormValidation.Required,
    },
  });

  const {
    isLoading: isCreating,
    error: createError,
    revalidate: create,
  } = useFetch(API_URL + `domains/${values.domain}/aliases`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      alias: values.alias,
      forward: values.forward,
    }),
    execute: false,
    async parseResponse(response) {
      return parseImprovMXResponse<{ alias: Alias }>(response, { pagination: false });
    },
    mapResult(result) {
      return {
        data: result.data,
      };
    },
    async onData(data) {
      const { alias } = data.alias;
      const { domain } = values;
      await showToast(
        Toast.Style.Success,
        "Alias created",
        "Alias created and copied to clipboard " + alias + "@" + domain,
      );
      await Clipboard.copy(alias + "@" + domain);
      await popToRoot({
        clearSearchBar: true,
      });
    },
  });
  const isLoading = isFetchingDomains || isFetchingAccount || isCreating;
  const error = domainsError || accountError || createError;

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Alias" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Domain" placeholder="Select a domain" {...itemProps.domain}>
        {data?.domains
          .filter((domain) => !domain.banned && domain.active)
          .map((domain) => (
            <Form.Dropdown.Item
              key={domain.display}
              icon={getFavicon(`https://${domain.display}`)}
              value={domain.display}
              title={domain.display}
            />
          ))}
      </Form.Dropdown>

      <Form.TextField title="Alias (without @domain)" placeholder="Enter an alias" {...itemProps.alias} />
      <Form.TextField title="Forwarding Email" placeholder="Enter a forwarding email" {...itemProps.forward} />
    </Form>
  );
}
