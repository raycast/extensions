import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
  Icon,
  Color,
  useNavigation,
} from "@raycast/api";
import { databasesList, connectToDatabase, capitalize } from "./utils";
import { useMemo, useState } from "react";
import { useFavorite } from "./hooks/use-favorite";
import { usePreferences } from "./hooks/use-preferences";
import { FormValidation, useForm } from "@raycast/utils";

async function open(name: string, protocol: string, database: string, pop?: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();

  try {
    pop && pop();
    connectToDatabase(name, prefs.username, protocol, database);
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

function OpenWithDatabaseForm(props: { name: string; protocol: string }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<SetupDefaultDatabaseFormValues>({
    async onSubmit(values) {
      await open(props.name, props.protocol, values.database, pop);
    },
    validation: {
      database: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Database" {...itemProps.database} />
    </Form>
  );
}

interface SetupDefaultDatabaseFormValues {
  database: string;
}

function SetupDefaultDatabaseForm(props: {
  name: string;
  defaults: Map<string, string>;
  setDefaults: (key: string, value: string) => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<SetupDefaultDatabaseFormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Connecting...",
      });

      try {
        pop();
        props.setDefaults(props.name, values.database);
        toast.style = Toast.Style.Success;
        toast.title = "Success !";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failure !";
      }
    },
    initialValues: {
      database: props.defaults.get(props.name) ?? "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Database" {...itemProps.database} />
    </Form>
  );
}

interface Item {
  metadata: {
    name: string;
    description: string;
  };
  spec: {
    protocol: string;
  };
}

export default function Command() {
  const { data, isLoading } = databasesList();
  const [searchText, setSearchText] = useState("");
  const { list, toggleFavorite } = useFavorite<string>("databases");
  const { list: defaults, set: setDefaults } = usePreferences("database-defaults");
  const results = useMemo(() => JSON.parse(data || "[]") || [], [data, defaults]).reduce((acc: any, item: Item) => {
    if (searchText.length > 0 && !item.metadata.name.toLowerCase().includes(searchText.toLowerCase())) {
      return acc;
    }

    if (list.has(item.metadata.name)) {
      acc["favorites"] ? acc["favorites"].push(item) : (acc["favorites"] = [item]);
      return acc;
    }

    const protocol = item.spec.protocol;
    acc[protocol] ? acc[protocol].push(item) : (acc[protocol] = [item]);

    return acc;
  }, {});

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText}>
      {Object.entries(results)
        .sort(([protocolA]: [string, any], [protocolB]: [string, any]) => {
          if (protocolA === "favorites") {
            return -1;
          }

          if (protocolB === "favorites") {
            return 1;
          }

          return protocolA.localeCompare(protocolB);
        })
        .map(([protocol, group]: [string, any]) => {
          return (
            <List.Section title={capitalize(protocol)} key={protocol}>
              {group
                .sort((itemA: Item, itemB: Item) => itemA.metadata.name.localeCompare(itemB.metadata.name))
                .map((item: Item, index: number) => {
                  const name = item.metadata.name;
                  const protocol = item.spec.protocol;
                  return (
                    <List.Item
                      key={name + protocol + index}
                      title={name}
                      subtitle={item.metadata.description}
                      accessories={[
                        {
                          icon: list.has(name)
                            ? {
                                source: Icon.Star,
                                tintColor: Color.Yellow,
                              }
                            : undefined,
                        },
                        {
                          tag: defaults.get(name)
                            ? {
                                value: defaults.get(name),
                              }
                            : "",
                        },
                        { tag: { value: capitalize(protocol) } },
                      ]}
                      icon={{ source: Icon.Dot, tintColor: Color.Green }}
                      actions={
                        <ActionPanel>
                          <Action
                            title="Open"
                            icon={Icon.Terminal}
                            onAction={() => open(name, protocol, defaults.get(name) ?? "")}
                          />
                          <Action.Push
                            title="Open With Database"
                            icon={Icon.Terminal}
                            target={<OpenWithDatabaseForm name={name} protocol={protocol} />}
                          />
                          <Action.Push
                            title="Setup Default Database"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                            icon={Icon.Cog}
                            target={
                              <SetupDefaultDatabaseForm name={name} defaults={defaults} setDefaults={setDefaults} />
                            }
                          />
                          <Action
                            title={list.has(name) ? "Unfavorite" : "Favorite"}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                            icon={Icon.Star}
                            onAction={() => toggleFavorite(name)}
                          />
                          <Action.CopyToClipboard content={name} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
                        </ActionPanel>
                      }
                    />
                  );
                })}
            </List.Section>
          );
        })}
    </List>
  );
}
