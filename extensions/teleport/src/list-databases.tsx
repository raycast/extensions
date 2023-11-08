import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues, Form, Icon, Color } from "@raycast/api";
import { databasesList, connectToDatabase, capitalize } from "./utils";
import { useMemo, useState } from "react";
import { useFavorite } from "./hooks/use-favorite";

async function open(name: string, protocol: string, database: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();

  try {
    connectToDatabase(name, prefs.username, protocol, database);
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

function DatabaseForm(props: { name: string; protocol: string }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: { database: string }) => {
              return open(props.name, props.protocol, values.database);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="database" title="Database" />
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
  const results = useMemo(() => JSON.parse(data || "[]") || [], [data]).reduce((acc: any, item: Item) => {
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
                        { tag: { value: capitalize(protocol) } },
                      ]}
                      icon={{ source: Icon.Dot, tintColor: Color.Green }}
                      actions={
                        <ActionPanel>
                          <Action title="Open" icon={Icon.Terminal} onAction={() => open(name, protocol, "")} />
                          <Action.Push
                            title="Open With Database"
                            icon={Icon.Terminal}
                            target={<DatabaseForm name={name} protocol={protocol} />}
                          />
                          <Action
                            title={list.has(name) ? "Unfavorite" : "Favorite"}
                            icon={Icon.Star}
                            onAction={() => toggleFavorite(name)}
                          />
                          <Action.CopyToClipboard content={name} />
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
