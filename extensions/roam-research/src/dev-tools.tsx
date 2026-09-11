// DEV ONLY — Not published to Raycast Store.
// To use during development, add this command entry to package.json "commands" array:
//   { "name": "dev-tools", "title": "Dev Tools", "description": "Inspect and clean up extension LocalStorage (development only)", "mode": "view" }

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  environment,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { keys } from "./utils";

export default function Command() {
  if (!environment.isDevelopment) {
    return (
      <Detail markdown="## Development Only\n\nThis command is only available when the extension is running in development mode." />
    );
  }
  const {
    value: graphsConfig = {},
    setValue: setGraphsConfig,
    isLoading: isGraphsLoading,
  } = useLocalStorage<GraphsConfigMap>("graphs-config", {});
  const {
    value: templatesConfig = { templates: [] },
    setValue: setTemplatesConfig,
    isLoading: isTemplatesLoading,
  } = useLocalStorage<TemplatesConfig>("templates-config", { templates: [] });

  const graphNames = keys(graphsConfig);

  // Detect orphaned "templates" fields left over from the old per-graph template system.
  // They still exist in LocalStorage but GraphConfig no longer has a templates field.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphsWithLegacyTemplates = graphNames.filter((name) => !!(graphsConfig[name] as any).templates);

  return (
    <List isLoading={isGraphsLoading || isTemplatesLoading} navigationTitle="Dev Tools">
      <List.Section title="graphs-config">
        {graphsWithLegacyTemplates.length > 0 && (
          <List.Item
            icon={Icon.Eraser}
            title="Clean Legacy Per-Graph Templates"
            subtitle={`${graphsWithLegacyTemplates.length} graph(s) have orphaned templates`}
            accessories={[{ tag: { value: "Cleanup", color: Color.Orange } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Remove Legacy Templates from All Graphs"
                  icon={Icon.Eraser}
                  onAction={async () => {
                    const cleaned = { ...graphsConfig };
                    for (const name of graphsWithLegacyTemplates) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                      const { templates: _, ...rest } = cleaned[name as string] as any;
                      cleaned[name as string] = rest;
                    }
                    await setGraphsConfig(cleaned);
                    showToast({
                      title: `Cleaned ${graphsWithLegacyTemplates.length} graph(s)`,
                      style: Toast.Style.Success,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        )}
        {graphNames.map((name) => {
          const graph = graphsConfig[name as string];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hasLegacyTemplates = !!(graph as any).templates;
          return (
            <List.Item
              key={name as string}
              icon={Icon.HardDrive}
              title={name as string}
              accessories={[
                ...(hasLegacyTemplates ? [{ tag: { value: "has legacy templates", color: Color.Orange } }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Raw JSON"
                    icon={Icon.Eye}
                    target={
                      <Detail
                        navigationTitle={`Graph: ${name as string}`}
                        markdown={`\`\`\`json\n${JSON.stringify(graph, null, 2)}\n\`\`\``}
                      />
                    }
                  />
                  <Action
                    title="Delete Graph Config"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={async () => {
                      await confirmAlert({
                        title: `Delete config for "${name as string}"?`,
                        message: "This removes the graph from the extension entirely.",
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                          async onAction() {
                            const newConfig = { ...graphsConfig };
                            delete newConfig[name as string];
                            await setGraphsConfig(newConfig);
                            showToast({ title: `Deleted "${name as string}"`, style: Toast.Style.Success });
                          },
                        },
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="templates-config">
        {templatesConfig.templates.length > 0 ? (
          templatesConfig.templates.map((tmpl, idx) => (
            <List.Item
              key={tmpl.id}
              icon={Icon.Document}
              title={`${idx + 1}. ${tmpl.name}`}
              subtitle={tmpl.contentTemplate.substring(0, 50)}
              accessories={[
                ...(tmpl.id === templatesConfig.instantCaptureTemplateId
                  ? [{ tag: { value: "Instant Capture", color: Color.Orange } }]
                  : []),
                ...(tmpl.graphName
                  ? [{ tag: { value: tmpl.graphName, color: Color.Purple } }]
                  : [{ tag: { value: "All Graphs", color: Color.Blue } }]),
                ...(tmpl.page ? [{ tag: { value: tmpl.page } }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Raw JSON"
                    icon={Icon.Eye}
                    target={
                      <Detail
                        navigationTitle={`Template: ${tmpl.name}`}
                        markdown={`\`\`\`json\n${JSON.stringify(tmpl, null, 2)}\n\`\`\``}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item
            icon={Icon.Document}
            title="No saved templates"
            subtitle="Using hardcoded default"
            accessories={[
              {
                tag: {
                  value: "legacyConsumed",
                  color: templatesConfig.legacyTemplateConsumed ? Color.Green : Color.Orange,
                },
              },
            ]}
          />
        )}
        <List.Item
          icon={Icon.Trash}
          title="Reset Templates Config"
          actions={
            <ActionPanel>
              <Action
                title="Reset Templates Config"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  await confirmAlert({
                    title: "Reset templates config?",
                    message: "This clears all saved templates and the legacyTemplateConsumed flag.",
                    primaryAction: {
                      title: "Reset",
                      style: Alert.ActionStyle.Destructive,
                      async onAction() {
                        await setTemplatesConfig({ templates: [] });
                        showToast({ title: "Templates config reset", style: Toast.Style.Success });
                      },
                    },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
