import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { getFavicon, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createAlias, getAliases, getDomains } from "./utils/api";
import { Alias, AliasesCreateRequest, AliasesRequestParameters, AliasesResponse, DomainsResponse } from "./utils/types";
import { API_DOMAIN } from "./utils/constants";

export default function Aliases() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [aliasesResponse, setAliasesResponse] = useState<AliasesResponse>();
  const [filter, setFilter] = useState("");
  const [filteredList, filterList] = useState<Alias[]>([]);

  async function getAliasesFromApi() {
    setIsLoading(true);
    const parameters: AliasesRequestParameters = { page_size: "9999", page: "1" };
    const response = await getAliases(parameters);
    if (!("error" in response)) {
      const numOfAliases = response.email_aliases.length;
      await showToast({
        title: "Success",
        message: `Fetched ${numOfAliases} ${numOfAliases === 1 ? "alias" : "aliases"}`,
        style: Toast.Style.Success,
      });
      setAliasesResponse(response);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    getAliasesFromApi();
  }, []);

  useEffect(() => {
    doFilter();
  }, [filter, aliasesResponse]);

  function doFilter() {
    if (aliasesResponse) {
      if (!filter) filterList(aliasesResponse.email_aliases);
      else if (filter === "enabled")
        filterList(aliasesResponse.email_aliases.filter((emailAlias) => emailAlias.enabled));
      else if (filter === "disabled")
        filterList(aliasesResponse.email_aliases.filter((emailAlias) => !emailAlias.enabled));
      else filterList([]);
    }
  }

  const numOfAliases = aliasesResponse && aliasesResponse.email_aliases.length;
  const title = aliasesResponse && `${numOfAliases} ${numOfAliases === 1 ? "alias" : "aliases"}`;
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search alias"
      searchBarAccessory={
        !aliasesResponse ? undefined : (
          <List.Dropdown tooltip="Filter" onChange={setFilter}>
            <List.Dropdown.Item title="All" value="" />
            <List.Dropdown.Section title="Status">
              <List.Dropdown.Item title="Enabled" value="enabled" />
              <List.Dropdown.Item title="Disabled" value="disabled" />
            </List.Dropdown.Section>
          </List.Dropdown>
        )
      }
      isShowingDetail={numOfAliases ? numOfAliases > 0 : false}
    >
      {aliasesResponse?.email_aliases.length === 0 ? (
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
            {filteredList.map((emailAlias) => (
              <List.Item
                key={emailAlias.address}
                title={emailAlias.address}
                icon={{ source: Icon.TwoPeople, tintColor: emailAlias.enabled ? Color.Green : Color.Red }}
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
    const response = await getDomains({ page_size: "9999", page: "1" });
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
            icon={getFavicon(`https://${domainItem.domain}`, { fallback: "shroud-email.png" })}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
