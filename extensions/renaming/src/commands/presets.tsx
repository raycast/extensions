import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Color,
  Form,
  useNavigation,
} from "@raycast/api";
import {
  getPresets,
  deletePreset,
  savePreset,
  DEFAULT_PRESETS,
  DEFAULT_TEMPLATE_PRESETS,
  isTemplatePreset,
  type RenamePreset,
} from "../lib/presets";
import { getCaseStyleLabel } from "../lib/case-transform";
import { getSortFieldLabel } from "../lib/template/sorting";
import type { CaseStyle } from "../types";

export default function Command() {
  const [presets, setPresets] = useState<RenamePreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const saved = await getPresets();
      setPresets(saved);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Presets",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAlert({
      title: `Delete "${name}"?`,
      message: "This preset will be permanently deleted.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deletePreset(id);
        await loadPresets();
        await showToast({
          style: Toast.Style.Success,
          title: "Preset Deleted",
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Delete Failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };

  const handleAddDefault = async (
    preset: (typeof DEFAULT_PRESETS)[number] | (typeof DEFAULT_TEMPLATE_PRESETS)[number],
  ) => {
    try {
      await savePreset(preset);
      await loadPresets();
      await showToast({
        style: Toast.Style.Success,
        title: "Preset Added",
        message: preset.name,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Preset",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const getPresetIcon = (preset: RenamePreset): { source: Icon; tintColor: Color } => {
    if (isTemplatePreset(preset)) {
      return { source: Icon.Document, tintColor: Color.Purple };
    }
    if (preset.type === "replace") {
      return { source: Icon.MagnifyingGlass, tintColor: Color.Orange };
    }
    return { source: Icon.Bookmark, tintColor: Color.Blue };
  };

  const getPresetTypeLabel = (preset: RenamePreset): string => {
    if (isTemplatePreset(preset)) return "Template";
    if (preset.type === "replace") return "Replace";
    return "Rename";
  };

  const getPresetDetailMarkdown = (preset: Omit<RenamePreset, "id" | "createdAt">): string => {
    const config = preset.config;
    const lines: string[] = [];

    lines.push(`## ${preset.name}`);
    if (preset.description) {
      lines.push(`\n${preset.description}`);
    }

    lines.push("\n---\n");

    // Template presets
    if (preset.type === "template" && config.template) {
      const t = config.template;
      lines.push("### Template Pattern");
      lines.push(`\`${t.pattern}\``);

      lines.push("\n### Settings");
      lines.push(`- **Date Source:** ${t.dateSource}`);
      lines.push(`- **Counter:** Start ${t.counter.start}, Step ${t.counter.step}, Padding ${t.counter.padding}`);
      if (t.sort.field !== "none") {
        lines.push(`- **Sort:** ${getSortFieldLabel(t.sort.field)} (${t.sort.direction})`);
      }
      if (t.caseStyle !== "unchanged") {
        lines.push(`- **Case:** ${getCaseStyleLabel(t.caseStyle)}`);
      }
      if (t.transliteration.enabled) {
        lines.push(`- **Transliteration:** Enabled${t.transliteration.removeAccents ? " (remove accents)" : ""}`);
      }
    }
    // Replace presets
    else if (preset.type === "replace") {
      lines.push("### Find & Replace");
      lines.push(`- **Find:** \`${config.replacePattern || ""}\``);
      lines.push(`- **Replace:** \`${config.replacement || ""}\``);
      if (config.useRegex) {
        lines.push("- **Mode:** Regular Expression");
      }
    }
    // Rename presets
    else {
      lines.push("### Settings");
      if (config.prefix) lines.push(`- **Prefix:** \`${config.prefix}\``);
      if (config.suffix) lines.push(`- **Suffix:** \`${config.suffix}\``);
      if (config.separator) lines.push(`- **Separator:** \`${config.separator}\``);
      if (config.caseStyle && config.caseStyle !== "unchanged") {
        lines.push(`- **Case:** ${getCaseStyleLabel(config.caseStyle)}`);
      }
      if (config.startNumber !== undefined) {
        lines.push(`- **Start Number:** ${config.startNumber}`);
      }
      if (config.paddingDigits) {
        lines.push(`- **Padding:** ${config.paddingDigits} digits`);
      }
    }

    return lines.join("\n");
  };

  const availableRenamePresets = DEFAULT_PRESETS.filter((dp) => !presets.some((p) => p.name === dp.name));
  const availableTemplatePresets = DEFAULT_TEMPLATE_PRESETS.filter((dp) => !presets.some((p) => p.name === dp.name));

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search presets...">
      {presets.length > 0 && (
        <List.Section title="Saved Presets" subtitle={`${presets.length} preset${presets.length !== 1 ? "s" : ""}`}>
          {presets.map((preset) => (
            <List.Item
              key={preset.id}
              title={preset.name}
              accessories={[{ tag: { value: getPresetTypeLabel(preset), color: getPresetIcon(preset).tintColor } }]}
              icon={getPresetIcon(preset)}
              detail={<List.Item.Detail markdown={getPresetDetailMarkdown(preset)} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Settings to Clipboard"
                    content={JSON.stringify(preset.config, null, 2)}
                  />
                  <Action
                    title="Delete Preset"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(preset.id, preset.name)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadPresets}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {availableRenamePresets.length > 0 && (
        <List.Section title="Default Rename Presets">
          {availableRenamePresets.map((preset, index) => (
            <List.Item
              key={`rename-${index}`}
              title={preset.name}
              icon={{ source: Icon.Download, tintColor: Color.SecondaryText }}
              accessories={[
                { tag: { value: preset.type === "replace" ? "Replace" : "Rename", color: Color.SecondaryText } },
              ]}
              detail={<List.Item.Detail markdown={getPresetDetailMarkdown(preset)} />}
              actions={
                <ActionPanel>
                  <Action title="Add This Preset" icon={Icon.Plus} onAction={() => handleAddDefault(preset)} />
                  <Action
                    title="Create New Preset"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<CreatePresetForm onSave={loadPresets} />)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {availableTemplatePresets.length > 0 && (
        <List.Section title="Default Template Presets">
          {availableTemplatePresets.map((preset, index) => (
            <List.Item
              key={`template-${index}`}
              title={preset.name}
              icon={{ source: Icon.Document, tintColor: Color.Purple }}
              accessories={[{ tag: { value: "Template", color: Color.Purple } }]}
              detail={<List.Item.Detail markdown={getPresetDetailMarkdown(preset)} />}
              actions={
                <ActionPanel>
                  <Action title="Add This Preset" icon={Icon.Plus} onAction={() => handleAddDefault(preset)} />
                  <Action
                    title="Create New Preset"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<CreatePresetForm onSave={loadPresets} />)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {presets.length === 0 &&
        availableRenamePresets.length === 0 &&
        availableTemplatePresets.length === 0 &&
        !isLoading && (
          <List.EmptyView
            title="All Presets Added"
            description="All default presets have been added to your saved presets"
            icon={Icon.Checkmark}
          />
        )}
    </List>
  );
}

interface CreatePresetFormProps {
  onSave: () => void;
}

function CreatePresetForm({ onSave }: CreatePresetFormProps) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: {
    name: string;
    description: string;
    prefix: string;
    suffix: string;
    separator: string;
    caseStyle: CaseStyle;
  }) => {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name Required",
        message: "Please enter a name for this preset",
      });
      return;
    }

    try {
      await savePreset({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        config: {
          prefix: values.prefix || undefined,
          suffix: values.suffix || undefined,
          separator: values.separator || "_",
          caseStyle: values.caseStyle || "unchanged",
          preserveName: true,
        },
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Save Failed",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Preset Saved",
      message: values.name,
    });

    onSave();
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preset" icon={Icon.Bookmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Preset" />
      <Form.TextField id="description" title="Description" placeholder="Optional description" />
      <Form.Separator />
      <Form.TextField id="prefix" title="Prefix" placeholder="Optional prefix" />
      <Form.TextField id="suffix" title="Suffix" placeholder="Optional suffix" />
      <Form.TextField id="separator" title="Separator" placeholder="_" />
      <Form.Dropdown id="caseStyle" title="Case Style" defaultValue="unchanged">
        <Form.Dropdown.Item value="unchanged" title="Unchanged" />
        <Form.Dropdown.Item value="uppercase" title="UPPERCASE" />
        <Form.Dropdown.Item value="lowercase" title="lowercase" />
        <Form.Dropdown.Item value="titleCase" title="Title Case" />
        <Form.Dropdown.Item value="camelCase" title="camelCase" />
        <Form.Dropdown.Item value="snakeCase" title="snake_case" />
        <Form.Dropdown.Item value="kebabCase" title="kebab-case" />
      </Form.Dropdown>
    </Form>
  );
}
