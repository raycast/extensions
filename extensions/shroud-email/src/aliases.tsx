import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { getFavicon, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createAlias, getAliases, getDomains } from "./utils/api";
import { AliasesCreateRequest, AliasesRequestParameters, AliasesResponse, DomainsResponse } from "./utils/types";
import { API_DOMAIN } from "./utils/constants";
import PageOptionsForm from "./components/PageOptionsForm";

export default function Aliases() {
  const { push } = useNavigation();
  const handleOptionsSelected = (page_size: string, page: string) =>
    push(<AliasesList page_size={page_size} page={page} />);
  return <PageOptionsForm onOptionsSelected={handleOptionsSelected} />;
}

function AliasesList({ page_size, page }: AliasesRequestParameters) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [aliases, setAliases] = useState<AliasesResponse>();

  async function getAliasesFromApi() {
    setIsLoading(true);
    const response = await getAliases({ page_size, page });
    if (!("error" in response)) {
      const numOfAliases = response.email_aliases.length;
      await showToast({
        title: "Success",
        message: `Fetched ${numOfAliases} ${numOfAliases === 1 ? "alias" : "aliases"}`,
        style: Toast.Style.Success,
      });
      setAliases(response);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    getAliasesFromApi();
  }, []);
  const title =
    aliases &&
    `Entries: ${aliases.email_aliases.length}/${aliases.total_entries} | Pages: ${aliases.page_number}/${aliases.total_pages}`;
  return !aliases ? null : (
    <List isLoading={isLoading} searchBarPlaceholder="Search alias" isShowingDetail={aliases.total_entries > 0}>
      {aliases.email_aliases.length === 0 ? (
        <List.EmptyView
          title="No aliases found."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Go To Aliases" icon={Icon.Globe} url={API_DOMAIN} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={title}>
            {aliases.email_aliases.map((emailAlias) => (
              <List.Item
                key={emailAlias.address}
                title={emailAlias.address}
                icon={Icon.TwoPeople}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={API_DOMAIN + `alias/${emailAlias.address.replace("@", "%40")}`}
                      icon={Icon.Globe}
                    />
                    <Action
                      title="Create New Alias"
                      icon={Icon.AddPerson}
                      onAction={() => push(<AliasesCreate onAliasCreated={getAliasesFromApi} />)}
                    />
                    <Action title="Reload Aliases" icon={Icon.Redo} onAction={getAliasesFromApi} />
                  </ActionPanel>
                }
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="address" text={emailAlias.address} />
                        <List.Item.Detail.Metadata.Label
                          title="enabled"
                          icon={emailAlias.enabled ? Icon.Check : Icon.Multiply}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="title"
                          text={emailAlias.title || undefined}
                          icon={!emailAlias.title ? Icon.Minus : undefined}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="notes"
                          text={emailAlias.notes || undefined}
                          icon={!emailAlias.notes ? Icon.Minus : undefined}
                        />
                        <List.Item.Detail.Metadata.Label title="forwarded" text={emailAlias.forwarded.toString()} />
                        <List.Item.Detail.Metadata.Label title="blocked" text={emailAlias.blocked.toString()} />
                        <List.Item.Detail.Metadata.Label
                          title="blocked_addresses"
                          text={emailAlias.blocked_addresses.length ? emailAlias.blocked_addresses.join() : undefined}
                          icon={!emailAlias.blocked_addresses.length ? Icon.Minus : undefined}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            ))}
          </List.Section>
          {!isLoading && (
            <List.Section title="Actions">
              <List.Item
                title="Create New Alias"
                icon={Icon.AddPerson}
                actions={
                  <ActionPanel>
                    <Action
                      title="Create New Alias"
                      icon={Icon.AddPerson}
                      onAction={() => push(<AliasesCreate onAliasCreated={getAliasesFromApi} />)}
                    />
                  </ActionPanel>
                }
              />
              <List.Item
                title="Reload Aliases"
                icon={Icon.Redo}
                actions={
                  <ActionPanel>
                    <Action title="Reload Aliases" icon={Icon.Redo} onAction={getAliasesFromApi} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

type AliasesCreateProps = {
  onAliasCreated: () => void;
};
function AliasesCreate({ onAliasCreated }: AliasesCreateProps) {
  const { pop } = useNavigation();

  const [domains, setDomains] = useState<DomainsResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<AliasesCreateRequest>({
    async onSubmit(values) {
      setIsLoading(true);

      const { local_part, domain } = values;
      const newAlias: AliasesCreateRequest = domain !== "RANDOM ALIAS ON DEFAULT DOMAIN" ? { local_part, domain } : {};
      const response = await createAlias(newAlias);
      if (!("error" in response)) {
        showToast(Toast.Style.Success, "Created Alias", response.address);
        onAliasCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      local_part(value) {
        if (itemProps.domain.value !== "RANDOM ALIAS ON DEFAULT DOMAIN")
          if (!value) return "The item is required";
          else if (value.includes("_")) return "The item can not include an underscore (_)";
      },
    },
  });

  async function getDomainsFromApi() {
    setIsLoading(true);
    const response = await getDomains({ page_size: "20", page: "1" });
    if (!("error" in response)) setDomains(response);
    setIsLoading(false);
  }
  useEffect(() => {
    getDomainsFromApi();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="NOTE"
        text={`Select 'RANDOM ALIAS ON DEFAULT DOMAIN' to generate a random email alias on the default, shared domain (@fog.shroud.email for hosted).`}
      />
      <Form.Separator />

      <Form.TextField title="Local Part" {...itemProps.local_part} />
      <Form.Dropdown title="Domain" {...itemProps.domain}>
        <Form.Dropdown.Item title="RANDOM ALIAS ON DEFAULT DOMAIN" value="RANDOM ALIAS ON DEFAULT DOMAIN" />
        {domains?.domains.map((domainItem) => (
          <Form.Dropdown.Item
            title={domainItem.domain}
            value={domainItem.domain}
            key={domainItem.domain}
            icon={getFavicon(`https://${domainItem.domain}`, { fallback: "Shroud.email.png" })}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
