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

interface Environment {
  value: string;
  label: string;
  color: string;
}

// TablePlus's fixed connection environments: the `environment` URL parameter only
// accepts these values. The status-bar color of each is configurable in preferences.
const ENVIRONMENT_DEFS = [
  { value: "local", label: "Local", preference: "colorLocal", defaultColor: "006633" },
  { value: "testing", label: "Testing", preference: "colorTesting", defaultColor: "666666" },
  { value: "development", label: "Development", preference: "colorDevelopment", defaultColor: "003366" },
  { value: "staging", label: "Staging", preference: "colorStaging", defaultColor: "996633" },
  { value: "production", label: "Production", preference: "colorProduction", defaultColor: "660000" },
];

function hexColor(value: unknown, fallback: string): string {
  const raw = String(value ?? "")
    .trim()
    .replace(/^#/, "")
    .toUpperCase();
  return /^[0-9A-F]{6}$/.test(raw) ? raw : fallback;
}

function resolveEnvironments(prefs: Record<string, unknown>): Environment[] {
  return ENVIRONMENT_DEFS.map((env) => ({
    value: env.value,
    label: env.label,
    color: hexColor(prefs[env.preference], env.defaultColor),
  }));
}

async function open(
  name: string,
  protocol: string,
  database: string,
  environment: Environment | undefined,
  pop?: () => void
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();
  const windowMode = prefs.openInNewWindow ? "isolated" : "tabbed";

  try {
    pop && pop();
    connectToDatabase(
      name,
      prefs.username,
      protocol,
      database,
      windowMode,
      environment?.value ?? "",
      environment?.color ?? ""
    );
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

function OpenWithDatabaseForm(props: { name: string; protocol: string; environment?: Environment }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<SetupDefaultDatabaseFormValues>({
    async onSubmit(values) {
      await open(props.name, props.protocol, values.database, props.environment, pop);
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

interface SetupEnvironmentFormValues {
  environment: string;
}

function SetupEnvironmentForm(props: {
  storageKey: string;
  current: string;
  environments: Environment[];
  setEnvironment: (key: string, value: string) => void;
  unsetEnvironment: (key: string) => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<SetupEnvironmentFormValues>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving...",
      });

      try {
        pop();
        if (values.environment) {
          props.setEnvironment(props.storageKey, values.environment);
        } else {
          props.unsetEnvironment(props.storageKey);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Success !";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failure !";
      }
    },
    initialValues: {
      environment: props.environments.some((env) => env.value === props.current) ? props.current : "",
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
      <Form.Dropdown title="Environment" {...itemProps.environment}>
        <Form.Dropdown.Item value="" title="None" icon={Icon.Circle} />
        {props.environments.map((env) => (
          <Form.Dropdown.Item
            key={env.value}
            value={env.value}
            title={env.label}
            icon={{ source: Icon.CircleFilled, tintColor: `#${env.color}` }}
          />
        ))}
      </Form.Dropdown>
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
  const {
    list: environmentValues,
    set: setEnvironment,
    unset: unsetEnvironment,
  } = usePreferences("database-environments");
  const prefs = getPreferenceValues();
  const environments = resolveEnvironments(prefs);
  const cluster = String(prefs.proxy ?? "");
  const results = useMemo(() => JSON.parse(data || "[]") || [], [data, defaults]).reduce(
    (acc: Record<string, Item[]>, item: Item) => {
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
    },
    {}
  );

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText}>
      {(Object.entries(results) as [string, Item[]][])
        .sort(([protocolA]: [string, Item[]], [protocolB]: [string, Item[]]) => {
          if (protocolA === "favorites") {
            return -1;
          }

          if (protocolB === "favorites") {
            return 1;
          }

          return protocolA.localeCompare(protocolB);
        })
        .map(([protocol, group]: [string, Item[]]) => {
          return (
            <List.Section title={capitalize(protocol)} key={protocol}>
              {group
                .sort((itemA: Item, itemB: Item) => itemA.metadata.name.localeCompare(itemB.metadata.name))
                .map((item: Item, index: number) => {
                  const name = item.metadata.name;
                  const protocol = item.spec.protocol;
                  // Scope the stored environment to the active cluster so same-named
                  // databases in different clusters do not share a tag.
                  const environmentKey = `${cluster}::${name}`;
                  const environment = environments.find((env) => env.value === environmentValues.get(environmentKey));
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
                          tag: environment
                            ? {
                                value: environment.label,
                                color: `#${environment.color}`,
                              }
                            : "",
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
                            onAction={() => open(name, protocol, defaults.get(name) ?? "", environment)}
                          />
                          <Action.Push
                            title="Open With Database"
                            icon={Icon.Terminal}
                            target={<OpenWithDatabaseForm name={name} protocol={protocol} environment={environment} />}
                          />
                          <Action.Push
                            title="Setup Default Database"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                            icon={Icon.Cog}
                            target={
                              <SetupDefaultDatabaseForm name={name} defaults={defaults} setDefaults={setDefaults} />
                            }
                          />
                          <Action.Push
                            title="Setup Environment"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                            icon={Icon.Tag}
                            target={
                              <SetupEnvironmentForm
                                storageKey={environmentKey}
                                current={environmentValues.get(environmentKey) ?? ""}
                                environments={environments}
                                setEnvironment={setEnvironment}
                                unsetEnvironment={unsetEnvironment}
                              />
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
