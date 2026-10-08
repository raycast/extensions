import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import DomainSelector from "./components/DomainSelector";
import { useState } from "react";
import { Alias, AliasCreate } from "./utils/types";
import { createDomainAlias, deleteDomainAlias, getDomainAliases } from "./utils/api";
import { FormValidation, MutatePromise, useCachedPromise, useForm } from "@raycast/utils";
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
  const {
    isLoading,
    data: aliases,
    error,
    mutate,
  } = useCachedPromise(
    async () => {
      const aliases = await getDomainAliases(domain);
      return aliases.data;
    },
    [],
    {
      async onData(data) {
        const numOfAliases = data.length;
        await showToast({
          title: "Success",
          message: `Fetched ${numOfAliases} ${numOfAliases === 1 ? "Alias" : "Aliases"}`,
          style: Toast.Style.Success,
        });
      },
      initialData: [],
      failureToastOptions: {
        title: "Mailwip Error",
      },
    },
  );

  if (error) return <ErrorComponent error={error.message} />;

  async function confirmAndDelete(alias: Alias) {
    const message = `${alias.from}@${domain} -> ${alias.to}`;
    if (
      await confirmAlert({
        icon: { source: Icon.RemovePerson, tintColor: Color.Red },
        title: "Delete alias?",
        message,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const toast = await showToast(Toast.Style.Animated, "Deleting alias", message);
      try {
        await mutate(deleteDomainAlias(domain, alias), {
          optimisticUpdate(data) {
            return data.filter((a) => a.from !== alias.from && a.to !== alias.to);
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Deleted alias";
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete alias";
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search alias">
      <List.Section title={`${domain}`} subtitle={`${aliases.length} ${aliases.length === 1 ? "alias" : "aliases"}`}>
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
                  <Action.CopyToClipboard title="Copy Alias" content={`${alias.from}@${domain}`} />
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="View Aliases Online"
                      url={`${APP_URL}domains/${domain}`}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                    <Action.Push
                      title="Create New Alias"
                      icon={Icon.AddPerson}
                      target={<AliasesCreate domain={domain} mutate={mutate} />}
                      shortcut={Keyboard.Shortcut.Common.New}
                    />
                    <Action
                      title="Reload Aliases"
                      icon={Icon.Redo}
                      onAction={mutate}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
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
                <Action.Push
                  title="Create New Alias"
                  icon={Icon.AddPerson}
                  target={<AliasesCreate domain={domain} mutate={mutate} />}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload Aliases"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action title="Reload Aliases" icon={Icon.Redo} onAction={mutate} />
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
  mutate: MutatePromise<Alias[]>;
};
function AliasesCreate({ domain, mutate }: AliasesCreateProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<AliasCreate>({
    async onSubmit(values) {
      setIsLoading(true);
      const message = `${values.from}@${domain} -> ${values.to}`;
      const toast = await showToast(Toast.Style.Animated, "Creating alias", message);
      try {
        await mutate(createDomainAlias(domain, values), {
          optimisticUpdate(data) {
            return [...data, values];
          },
          shouldRevalidateAfter: false,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created alias";
        pop();
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create alias";
      } finally {
        setIsLoading(false);
      }
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
            title="Go to API Reference"
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
