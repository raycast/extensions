import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  useGraphsConfig,
  useTemplatesConfig,
  getFirstTemplate,
  resolveInstantCapture,
  resolveCaptureTags,
  keys,
  crossPlatformShortcut,
} from "./utils";
import { captureWithOutbox } from "./outbox";
import { CaptureError, addUsedPage } from "./roamApi";
import { QuickCaptureForm } from "./components";

// --- Shared capture helper for shortcut actions (screens 1-3) ---

async function performQuickCapture(params: { content: string; graphConfig: GraphConfig; template: CaptureTemplate }) {
  const { content, graphConfig, template } = params;
  const preferences = getPreferenceValues<Preferences>();
  const tags = resolveCaptureTags(template, preferences);

  showToast({ title: "Capturing...", style: Toast.Style.Animated });

  const result = await captureWithOutbox({
    graphName: graphConfig.nameField,
    token: graphConfig.tokenField,
    content,
    template: template.contentTemplate,
    tags,
    page: template.page || undefined,
    nestUnder: template.nestUnder || undefined,
    templateName: template.name,
  });

  const graphName = graphConfig.nameField;
  if (result.success) {
    if (template.page) addUsedPage(graphName, template.page);
    const title = template.page
      ? `Appended to [[${template.page}]] in ${graphName}`
      : `Added to daily note in ${graphName}`;
    showToast({ title, style: Toast.Style.Success });
    setTimeout(() => popToRoot(), 500);
  } else if (result.error instanceof CaptureError && result.error.isRetryable) {
    showToast({
      title: `Saved to outbox for ${graphName}`,
      message: "Will retry automatically",
      style: Toast.Style.Failure,
    });
    setTimeout(() => popToRoot(), 500);
  } else {
    showToast({ title: "Failed to capture", message: result.error?.message, style: Toast.Style.Failure });
  }
}

// Resolve graph for a template: graph-specific → that graph, universal + single graph → that graph
function resolveGraphForTemplate(
  template: CaptureTemplate,
  graphsConfig: GraphsConfigMap,
  appendableGraphNames: string[]
): GraphConfig | undefined {
  if (template.graphName) {
    return graphsConfig[template.graphName];
  }
  if (appendableGraphNames.length === 1) {
    return graphsConfig[appendableGraphNames[0]];
  }
  return undefined;
}

// --- Platform-aware shortcut label ---
const captureShortcutLabel = process.platform === "win32" ? "Ctrl+Shift+Enter" : "⌘⇧↵";

// --- Screen 3: Graph Selection ---

const GraphSelectionList = ({
  graphsConfig,
  template,
  content,
  appendableGraphNames,
}: {
  graphsConfig: GraphsConfigMap;
  template: CaptureTemplate;
  content: string;
  appendableGraphNames: string[];
}) => {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Select Graph">
      <List.Section title="Graphs" subtitle={`${captureShortcutLabel} Capture with selected graph`}>
        {appendableGraphNames.map((graphName) => {
          const graphConfig = graphsConfig[graphName];
          return (
            <List.Item
              key={graphName}
              title={graphName}
              icon={Icon.HardDrive}
              actions={
                <ActionPanel>
                  <Action
                    title="Select"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      push(<QuickCaptureForm graphConfig={graphConfig} content={content} template={template} />);
                    }}
                  />
                  <Action
                    title="Capture"
                    icon={Icon.Upload}
                    shortcut={crossPlatformShortcut(["cmd", "shift"], "return")}
                    onAction={() => performQuickCapture({ content, graphConfig, template })}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};

// --- Screen 2: Template Selection ---

const TemplateSelectionList = ({
  templatesConfig,
  graphsConfig,
  content,
  appendableGraphNames,
}: {
  templatesConfig: TemplatesConfig;
  graphsConfig: GraphsConfigMap;
  content: string;
  appendableGraphNames: string[];
}) => {
  const { push } = useNavigation();
  const allTemplates =
    templatesConfig.templates.length > 0 ? templatesConfig.templates : [getFirstTemplate(templatesConfig)];

  return (
    <List navigationTitle="Select Template">
      <List.Section title="Templates" subtitle={`${captureShortcutLabel} Capture with selected template`}>
        {allTemplates.map((tmpl) => (
          <List.Item
            key={tmpl.id}
            title={tmpl.name}
            subtitle={tmpl.page || "Daily Notes Page"}
            accessories={[
              ...(tmpl.id === templatesConfig.instantCaptureTemplateId
                ? [{ tag: { value: "Instant Capture", color: Color.Orange } }]
                : []),
              ...(tmpl.graphName
                ? [{ tag: { value: tmpl.graphName, color: Color.Purple } }]
                : [{ tag: { value: "All Graphs", color: Color.Blue } }]),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  icon={Icon.ArrowRight}
                  onAction={() => {
                    if (tmpl.graphName) {
                      const graphConfig = graphsConfig[tmpl.graphName];
                      if (!graphConfig) {
                        showToast({ title: `Graph "${tmpl.graphName}" not found`, style: Toast.Style.Failure });
                        return;
                      }
                      push(<QuickCaptureForm graphConfig={graphConfig} content={content} template={tmpl} />);
                    } else if (appendableGraphNames.length === 1) {
                      const graphConfig = graphsConfig[appendableGraphNames[0]];
                      push(<QuickCaptureForm graphConfig={graphConfig} content={content} template={tmpl} />);
                    } else {
                      push(
                        <GraphSelectionList
                          graphsConfig={graphsConfig}
                          template={tmpl}
                          content={content}
                          appendableGraphNames={appendableGraphNames}
                        />
                      );
                    }
                  }}
                />
                <Action
                  title="Capture"
                  icon={Icon.Upload}
                  shortcut={crossPlatformShortcut(["cmd", "shift"], "return")}
                  onAction={() => {
                    const graphConfig = resolveGraphForTemplate(tmpl, graphsConfig, appendableGraphNames);
                    if (!graphConfig) {
                      if (tmpl.graphName) {
                        showToast({ title: `Graph "${tmpl.graphName}" not found`, style: Toast.Style.Failure });
                      } else {
                        // Universal template + multiple graphs — push to graph selection
                        push(
                          <GraphSelectionList
                            graphsConfig={graphsConfig}
                            template={tmpl}
                            content={content}
                            appendableGraphNames={appendableGraphNames}
                          />
                        );
                      }
                      return;
                    }
                    performQuickCapture({ content, graphConfig, template: tmpl });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

// --- Screen 1: Content Entry (command entry point) ---

export default function Command() {
  const { graphsConfig, isGraphsConfigLoading, orderedGraphNames } = useGraphsConfig();
  const { templatesConfig, isTemplatesConfigLoading } = useTemplatesConfig();
  const { push } = useNavigation();

  if (!isGraphsConfigLoading && keys(graphsConfig).length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="Please add graph first" />
      </List>
    );
  }

  const appendableGraphNames = !isGraphsConfigLoading
    ? orderedGraphNames.filter((name) => graphsConfig[name]?.capabilities?.append !== false)
    : [];

  if (!isGraphsConfigLoading && appendableGraphNames.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tray}
          title="No graphs with capture access"
          description="Add a graph with a write or append-only token to use Quick Capture."
        />
      </List>
    );
  }

  const isLoading = isGraphsConfigLoading || isTemplatesConfigLoading;
  const [content, setContent] = useState("");

  const effectiveTemplates =
    !isLoading && templatesConfig.templates.length > 0
      ? templatesConfig.templates
      : [getFirstTemplate(templatesConfig)];

  const handleContinue = () => {
    if (isLoading) {
      showToast({ title: "Loading config...", style: Toast.Style.Animated });
      return;
    }
    if (!content.trim()) {
      showToast({ title: "Content can't be empty", style: Toast.Style.Failure });
      return;
    }
    const trimmed = content.trim();

    if (effectiveTemplates.length === 1) {
      const tmpl = effectiveTemplates[0];
      if (tmpl.graphName) {
        const graphConfig = graphsConfig[tmpl.graphName];
        if (!graphConfig) {
          showToast({ title: `Graph "${tmpl.graphName}" not found`, style: Toast.Style.Failure });
          return;
        }
        push(<QuickCaptureForm graphConfig={graphConfig} content={trimmed} template={tmpl} />);
      } else if (appendableGraphNames.length === 1) {
        const graphConfig = graphsConfig[appendableGraphNames[0]];
        push(<QuickCaptureForm graphConfig={graphConfig} content={trimmed} template={tmpl} />);
      } else {
        push(
          <GraphSelectionList
            graphsConfig={graphsConfig}
            template={tmpl}
            content={trimmed}
            appendableGraphNames={appendableGraphNames}
          />
        );
      }
    } else {
      push(
        <TemplateSelectionList
          templatesConfig={templatesConfig}
          graphsConfig={graphsConfig}
          content={trimmed}
          appendableGraphNames={appendableGraphNames}
        />
      );
    }
  };

  // Resolve instant capture template for Cmd+Shift+Enter / Ctrl+Shift+Enter shortcut
  const instantCapture = !isLoading ? resolveInstantCapture(templatesConfig, graphsConfig) : undefined;

  const handleCaptureWithDefaults = async () => {
    if (!content.trim()) {
      showToast({ title: "Content can't be empty", style: Toast.Style.Failure });
      return;
    }
    if (isLoading) {
      showToast({ title: "Loading config...", style: Toast.Style.Animated });
      return;
    }
    const resolved = resolveInstantCapture(templatesConfig, graphsConfig);
    if (!resolved) {
      showToast({
        title: "No Instant Capture template set",
        message: "Set a graph-specific template as your Instant Capture template in Manage Capture Templates",
        style: Toast.Style.Failure,
      });
      return;
    }
    await performQuickCapture({
      content: content.trim(),
      graphConfig: resolved.graphConfig,
      template: resolved.template,
    });
  };

  return (
    <List
      navigationTitle="Quick Capture"
      searchBarPlaceholder="Type content you want to capture here"
      filtering={false}
      onSearchTextChange={setContent}
    >
      <List.Item
        title="Continue after typing above"
        icon={Icon.ArrowRight}
        subtitle="Select template and graph"
        actions={
          <ActionPanel>
            <Action title="Continue" icon={Icon.ArrowRight} onAction={handleContinue} />
            {instantCapture && (
              <Action
                title="Capture with Defaults"
                icon={Icon.Upload}
                shortcut={crossPlatformShortcut(["cmd", "shift"], "return")}
                onAction={handleCaptureWithDefaults}
              />
            )}
          </ActionPanel>
        }
      />
      {instantCapture && (
        <List.Item
          title={`Capture to ${instantCapture.graphConfig.nameField} with template "${instantCapture.template.name}"`}
          icon={Icon.Upload}
          accessories={[{ text: captureShortcutLabel }]}
          actions={
            <ActionPanel>
              <Action title="Capture with Defaults" icon={Icon.Upload} onAction={handleCaptureWithDefaults} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
