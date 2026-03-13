import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import DomainSelector from "./components/DomainSelector";
import { useEffect, useState } from "react";
import { Alias, AliasCreate } from "./utils/types";
import { createDomainAlias, deleteDomainAlias, getDomainAliases } from "./utils/api";
import { FormValidation, useForm } from "@raycast/utils";
import { APP_URL } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";

export default function Aliases() {
  const { push } = useNavigation();
  const handleDomainSelected = (domain: string) => push(<AliasesIndex domain={domain} />);
  return <DomainSelector onDomainSelected={handleDomainSelected} />;
}

type AliasesIndexProps = {
  domain: string;
};
function AliasesIndex({ domain }: AliasesIndexProps) {
  const { push, pop } = useNavigation();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function getDomainAliasesFromApi() {
    setIsLoading(true);
    const response = await getDomainAliases(domain);
    if (!("errors" in response)) {
      const numOfAliases = response.data.length;
      await showToast({
        title: "Success",
        message: `Fetched ${numOfAliases} ${numOfAliases === 1 ? "Alias" : "Aliases"}`,
        style: Toast.Style.Success,
      });
      setAliases(response.data);
    } else {
      pop();
      push(<ErrorComponent error={response.errors} />);
    }
    setIsLoading(false);
  }
  useEffect(() => {
    getDomainAliasesFromApi();
  }, []);

  async function confirmAndDelete(alias: Alias) {
    if (
      await confirmAlert({
        title: `Delete '${alias.from}@${domain} -> ${alias.to}'?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteDomainAlias(domain, alias);
      if (!("errors" in response)) {
        showToast(Toast.Style.Success, "Deleted Alias", `${alias.from} -> ${alias.to}`);
        await getDomainAliasesFromApi();
      }
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search alias...">
      <List.Section title={`${domain} | ${aliases.length} ${aliases.length === 1 ? "alias" : "aliases"}`}>
        {!isLoading &&
          aliases.map((alias, aliasIndex) => (
            <List.Item
              key={aliasIndex}
              title={alias.from + " -> " + alias.to}
              icon={Icon.TwoPeople}
              actions={
                <ActionPanel>
                  <Action
                    title="Delete Alias"
                    icon={Icon.RemovePerson}
                    style={Action.Style.Destructive}
                    onAction={() => confirmAndDelete(alias)}
                  />
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="View Aliases Online" url={`${APP_URL}domains/${domain}`} />
                    <Action
                      title="Create New Alias"
                      icon={Icon.AddPerson}
                      onAction={() => push(<AliasesCreate domain={domain} onAliasCreated={getDomainAliasesFromApi} />)}
                    />
                    <Action title="Reload Aliases" icon={Icon.Redo} onAction={getDomainAliasesFromApi} />
                  </ActionPanel.Section>
                </ActionPanel>
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
                  onAction={() => push(<AliasesCreate domain={domain} onAliasCreated={getDomainAliasesFromApi} />)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload Aliases"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action title="Reload Aliases" icon={Icon.Redo} onAction={getDomainAliasesFromApi} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type AliasesCreateProps = {
  domain: string;
  onAliasCreated: () => void;
};
function AliasesCreate({ domain, onAliasCreated }: AliasesCreateProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<AliasCreate>({
    async onSubmit(values) {
      setIsLoading(true);

      const newAlias = { ...values };
      const response = await createDomainAlias(domain, newAlias);
      if (!("errors" in response)) {
        showToast(Toast.Style.Success, "Created Alias", `${response.from} -> ${response.to}`);
        onAliasCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      from: FormValidation.Required,
      to: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Go To API Reference"
            url="https://mailwip.com/api/?javascript#email-aliases"
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />

      <Form.Separator />
      <Form.TextField title="From" placeholder="temporary" info="use * for catch all" {...itemProps.from} />
      <Form.Description text={`${itemProps.from.value || "[ADDRESS]"}@${domain}`} />
      <Form.TextField
        title="To"
        placeholder="personal@example.org"
        info="Forward to this Email Address"
        {...itemProps.to}
      />
    </Form>
  );
}
