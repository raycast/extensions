import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { useState } from "react";
import {
  useGraphsConfig,
  useTemplatesConfig,
  getFirstTemplate,
  keys,
  BUILTIN_DEFAULT_TEMPLATE,
  crossPlatformShortcut,
} from "./utils";
import {
  PageDropdown,
  CONTENT_TEMPLATE_HELP,
  GraphTagPicker,
  useGraphPages,
  resolvePageFromDropdown,
} from "./components";

// --- Template List View ---

export const TemplateListView = () => {
  const { graphsConfig } = useGraphsConfig();
  const {
    templatesConfig,
    isTemplatesConfigLoading,
    saveTemplate,
    removeTemplate,
    moveTemplate,
    setInstantCaptureTemplate,
    clearInstantCaptureTemplate,
  } = useTemplatesConfig();

  if (isTemplatesConfigLoading) {
    return <List isLoading={true} />;
  }

  const templates = templatesConfig.templates;
  const effectiveBuiltin = getFirstTemplate(templatesConfig);
  const hasTemplates = templates.length > 0;

  const renderTemplate = (tmpl: CaptureTemplate, idx: number) => {
    const graphExists = !tmpl.graphName || !!graphsConfig[tmpl.graphName];
    const isInstantCapture = tmpl.id === templatesConfig.instantCaptureTemplateId;
    const isGraphSpecific = !!tmpl.graphName;
    return (
      <List.Item
        key={tmpl.id}
        title={tmpl.name}
        subtitle={tmpl.page || "Daily Notes Page"}
        accessories={[
          ...(isInstantCapture ? [{ tag: { value: "Instant Capture", color: Color.Orange } }] : []),
          ...(tmpl.graphName
            ? [
                {
                  tag: {
                    value: tmpl.graphName,
                    color: graphExists ? Color.Purple : Color.Red,
                  },
                },
              ]
            : [{ tag: { value: "All Graphs", color: Color.Blue } }]),
          ...(!graphExists ? [{ tag: { value: "Graph not found", color: Color.Red } }] : []),
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Edit Template"
              icon={Icon.Pencil}
              target={
                <TemplateFormView
                  graphsConfig={graphsConfig}
                  templatesConfig={templatesConfig}
                  existingTemplate={tmpl}
                  onSave={saveTemplate}
                  setInstantCaptureTemplate={setInstantCaptureTemplate}
                  clearInstantCaptureTemplate={clearInstantCaptureTemplate}
                />
              }
            />
            {isGraphSpecific && !isInstantCapture && graphExists && (
              <Action
                title="Set as Instant Capture Template"
                icon={Icon.Bolt}
                onAction={() => {
                  setInstantCaptureTemplate(tmpl.id);
                  showToast({ title: `"${tmpl.name}" set as Instant Capture template`, style: Toast.Style.Success });
                }}
              />
            )}
            {isInstantCapture && (
              <Action
                title="Remove as Instant Capture Template"
                icon={Icon.BoltDisabled}
                onAction={() => {
                  clearInstantCaptureTemplate();
                  showToast({ title: `Removed Instant Capture designation`, style: Toast.Style.Success });
                }}
              />
            )}
            {idx > 0 && (
              <Action
                title="Move Up"
                icon={Icon.ArrowUp}
                shortcut={crossPlatformShortcut(["cmd", "shift"], "arrowUp")}
                onAction={() => moveTemplate(tmpl.id, "up")}
              />
            )}
            {idx < templates.length - 1 && (
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={crossPlatformShortcut(["cmd", "shift"], "arrowDown")}
                onAction={() => moveTemplate(tmpl.id, "down")}
              />
            )}
            <Action.Push
              title="Create New Template"
              icon={Icon.Plus}
              target={
                <TemplateFormView
                  graphsConfig={graphsConfig}
                  templatesConfig={templatesConfig}
                  onSave={saveTemplate}
                  setInstantCaptureTemplate={setInstantCaptureTemplate}
                  clearInstantCaptureTemplate={clearInstantCaptureTemplate}
                />
              }
              shortcut={Keyboard.Shortcut.Common.New}
            />
            <Action
              title="Delete Template"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                await confirmAlert({
                  title: `Delete "${tmpl.name}"?`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                    onAction() {
                      removeTemplate(tmpl.id);
                      showToast({ title: `Deleted "${tmpl.name}"`, style: Toast.Style.Success });
                    },
                  },
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List navigationTitle="Capture Templates">
      {hasTemplates ? (
        templates.map((tmpl, idx) => renderTemplate(tmpl, idx))
      ) : (
        <List.Item
          key="__builtin__"
          title={effectiveBuiltin.name}
          subtitle={effectiveBuiltin.page || "Daily Notes Page"}
          accessories={[
            { tag: { value: "All Graphs", color: Color.Blue } },
            { tag: { value: "Built-in", color: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Template"
                icon={Icon.Plus}
                target={
                  <TemplateFormView
                    graphsConfig={graphsConfig}
                    templatesConfig={templatesConfig}
                    onSave={saveTemplate}
                    setInstantCaptureTemplate={setInstantCaptureTemplate}
                    clearInstantCaptureTemplate={clearInstantCaptureTemplate}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        icon={Icon.Plus}
        title="Create New Template"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create New Template"
              target={
                <TemplateFormView
                  graphsConfig={graphsConfig}
                  templatesConfig={templatesConfig}
                  onSave={saveTemplate}
                  setInstantCaptureTemplate={setInstantCaptureTemplate}
                  clearInstantCaptureTemplate={clearInstantCaptureTemplate}
                />
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
};

// --- Template Form View (scope-aware) ---

const TemplateFormView = ({
  graphsConfig,
  templatesConfig,
  existingTemplate,
  onSave,
  setInstantCaptureTemplate,
  clearInstantCaptureTemplate,
}: {
  graphsConfig: GraphsConfigMap;
  templatesConfig: TemplatesConfig;
  existingTemplate?: CaptureTemplate;
  onSave: (template: CaptureTemplate) => void;
  setInstantCaptureTemplate: (templateId: string) => void;
  clearInstantCaptureTemplate: () => void;
}) => {
  const { pop } = useNavigation();

  const appendableGraphNames = keys(graphsConfig).filter(
    (name) => graphsConfig[name].capabilities?.append !== false
  ) as string[];

  const isBuiltin = existingTemplate?.id === "__builtin__";

  // Scope state — built-in template is locked to universal
  const [scope, setScope] = useState<string>(
    isBuiltin ? "universal" : existingTemplate?.graphName ? "graph-specific" : "universal"
  );
  const [selectedGraph, setSelectedGraph] = useState<string>(
    existingTemplate?.graphName || appendableGraphNames[0] || ""
  );

  // Instant capture checkbox state
  const isCurrentlyInstantCapture = existingTemplate?.id === templatesConfig.instantCaptureTemplateId;
  const [useForInstantCapture, setUseForInstantCapture] = useState(isCurrentlyInstantCapture);

  // Graph pages for graph-specific templates
  const graphConfig = scope === "graph-specific" && selectedGraph ? graphsConfig[selectedGraph] : undefined;
  const noopGraphConfig: GraphConfig = {
    nameField: "",
    tokenField: "",
    capabilities: { read: false, append: false, edit: false },
  };
  const { canRead, isGraphPagesLoading, graphPagesData, usedPages, usedPagesSet } = useGraphPages(
    graphConfig || noopGraphConfig
  );
  const showGraphPickers = scope === "graph-specific" && graphConfig;

  // Strip {tags} from displayed template when graph can't read (no TagPicker shown)
  const displayTemplate = (tmpl: string) =>
    scope === "graph-specific" && !canRead ? tmpl.replace(/\s*\{tags\}/gi, "") : tmpl;

  // Form state
  const [name, setName] = useState(existingTemplate?.name || "");
  const [customPageTitle, setCustomPageTitle] = useState("");
  const [nestUnder, setNestUnder] = useState(existingTemplate?.nestUnder || "");
  const [tags, setTags] = useState<string[]>(existingTemplate?.tags || []);
  const [tagsText, setTagsText] = useState((existingTemplate?.tags || []).join(", "));
  const [contentTemplate, setContentTemplate] = useState(
    existingTemplate?.contentTemplate || displayTemplate(BUILTIN_DEFAULT_TEMPLATE.contentTemplate)
  );
  const [pageDropdownValue, setPageDropdownValue] = useState(existingTemplate?.page || "");
  const [plainPageText, setPlainPageText] = useState(existingTemplate?.page || "");

  const handleGraphSwitch = (graphName: string) => {
    setSelectedGraph(graphName);
    setPageDropdownValue("");
    setCustomPageTitle("");
    setTags([]);
  };

  return (
    <Form
      navigationTitle={existingTemplate ? `Edit "${existingTemplate.name}"` : "New Capture Template"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existingTemplate ? "Save Template" : "Create Template"}
            onSubmit={async () => {
              if (!name.trim()) {
                showToast({ title: "Template name is required", style: Toast.Style.Failure });
                return;
              }
              if (!contentTemplate.trim()) {
                showToast({ title: "Content template is required", style: Toast.Style.Failure });
                return;
              }
              if (scope === "graph-specific" && !selectedGraph) {
                showToast({ title: "Please select a graph", style: Toast.Style.Failure });
                return;
              }

              const trimmedName = name.trim().toLowerCase();
              const otherTemplates = templatesConfig.templates.filter((t) => t.id !== existingTemplate?.id);
              const isDuplicate = otherTemplates.some((t) => t.name.trim().toLowerCase() === trimmedName);
              if (isDuplicate) {
                showToast({ title: "A template with this name already exists", style: Toast.Style.Failure });
                return;
              }

              // Resolve page
              let page: string | undefined;
              if (showGraphPickers) {
                const resolved = resolvePageFromDropdown(pageDropdownValue, customPageTitle);
                if ("error" in resolved) {
                  showToast({ title: resolved.error, style: Toast.Style.Failure });
                  return;
                }
                page = resolved.page;
              } else {
                page = plainPageText.trim() || undefined;
              }

              // Resolve tags
              const resolvedTags = showGraphPickers
                ? tags.length > 0
                  ? tags
                  : undefined
                : tagsText.trim()
                ? tagsText
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                : undefined;

              const template: CaptureTemplate = {
                id: existingTemplate?.id ?? randomUUID(),
                name: name.trim(),
                graphName: scope === "graph-specific" ? selectedGraph : undefined,
                page,
                nestUnder: nestUnder.trim() || undefined,
                tags: resolvedTags,
                contentTemplate,
              };

              onSave(template);

              // Handle instant capture designation
              if (scope === "graph-specific" && useForInstantCapture) {
                setInstantCaptureTemplate(template.id);
              } else if (isCurrentlyInstantCapture && !useForInstantCapture) {
                clearInstantCaptureTemplate();
              }
              // Note: if scope changed to universal, saveTemplate already clears the designation via invariant

              showToast({
                title: existingTemplate ? `Updated "${template.name}"` : `Created "${template.name}"`,
                style: Toast.Style.Success,
              });
              pop();
            }}
          />
          {existingTemplate?.id === "__builtin__" && (
            <Action
              title="Reset to Default"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => {
                onSave({ ...BUILTIN_DEFAULT_TEMPLATE, id: "__builtin__" });
                showToast({ title: "Reset to default template", style: Toast.Style.Success });
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Template name"
        placeholder="e.g. Daily Capture, Work TODO"
        value={name}
        onChange={setName}
      />
      <Form.Separator />
      {isBuiltin ? (
        <Form.Description title="Scope" text="All Graphs (built-in template — scope cannot be changed)" />
      ) : (
        <Form.Dropdown
          id="scope"
          title="Scope"
          value={scope}
          onChange={(val) => {
            setScope(val);
            if (val === "universal") setUseForInstantCapture(false);
          }}
        >
          <Form.Dropdown.Item value="universal" title="All Graphs" />
          <Form.Dropdown.Item value="graph-specific" title="Specific Graph" />
        </Form.Dropdown>
      )}
      {scope === "graph-specific" && (
        <>
          <Form.Dropdown id="graph" title="Graph" value={selectedGraph} onChange={handleGraphSwitch}>
            {appendableGraphNames.map((graphName) => (
              <Form.Dropdown.Item key={graphName} value={graphName} title={graphName} />
            ))}
          </Form.Dropdown>
          <Form.Checkbox
            id="useForInstantCapture"
            label="Use for Instant Capture"
            value={useForInstantCapture}
            onChange={setUseForInstantCapture}
          />
        </>
      )}
      <Form.Separator />
      {showGraphPickers ? (
        <>
          <PageDropdown
            value={pageDropdownValue}
            onChange={setPageDropdownValue}
            customPageTitle={customPageTitle}
            onCustomPageTitleChange={setCustomPageTitle}
            canRead={canRead}
            isGraphPagesLoading={isGraphPagesLoading}
            graphPagesData={graphPagesData}
            usedPages={usedPages}
            usedPagesSet={usedPagesSet}
          />
          <Form.TextField
            id="nestUnder"
            title="Nest under"
            placeholder="Optional: parent block to nest under"
            value={nestUnder}
            onChange={setNestUnder}
          />
          <GraphTagPicker
            canRead={canRead}
            isGraphPagesLoading={isGraphPagesLoading}
            graphPagesData={graphPagesData}
            usedPages={usedPages}
            usedPagesSet={usedPagesSet}
            value={tags}
            onChange={setTags}
          />
        </>
      ) : (
        <>
          <Form.TextField
            id="page"
            title="Page"
            placeholder="Leave empty for Daily Notes Page"
            value={plainPageText}
            onChange={setPlainPageText}
          />
          <Form.TextField
            id="nestUnder"
            title="Nest under"
            placeholder="Optional: parent block to nest under"
            value={nestUnder}
            onChange={setNestUnder}
          />
          <Form.TextField
            id="tags"
            title="Tags"
            placeholder="Comma-separated, e.g. Work, Personal"
            value={tagsText}
            onChange={setTagsText}
          />
        </>
      )}
      <Form.Separator />
      <Form.TextArea
        id="contentTemplate"
        title="Content template"
        value={contentTemplate}
        onChange={setContentTemplate}
      />
      <Form.Description title="" text={CONTENT_TEMPLATE_HELP} />
    </Form>
  );
};

// --- Command Entry Point ---

export default function Command() {
  return <TemplateListView />;
}
