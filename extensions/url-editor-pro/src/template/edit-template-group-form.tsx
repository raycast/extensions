import { Form, ActionPanel, Action, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { TemplateGroup } from "../types";

interface EditTemplateGroupFormProps {
  group?: TemplateGroup; // undefined for new group
  onSave: (groups: TemplateGroup[]) => void;
  existingGroups: TemplateGroup[];
}

export function EditTemplateGroupForm({ group, onSave, existingGroups }: EditTemplateGroupFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [enabled, setEnabled] = useState(group?.enabled !== false);
  const [templates, setTemplates] = useState<string[]>(group?.templates || [""]);

  // Validate template syntax
  function validateTemplate(template: string): { valid: boolean; error?: string } {
    if (!template.trim()) {
      return { valid: false, error: "Template cannot be empty" };
    }

    // Check for balanced braces
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: "Unmatched braces in template" };
    }

    // Check for valid variable syntax
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = variablePattern.exec(template)) !== null) {
      const variableText = match[1].trim();
      if (!variableText) {
        return { valid: false, error: "Empty variable placeholder" };
      }
    }

    return { valid: true };
  }

  function handleAddTemplate() {
    setTemplates([...templates, ""]);
  }

  function handleRemoveTemplate(index: number) {
    if (templates.length > 1) {
      setTemplates(templates.filter((_, i) => i !== index));
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove",
        message: "At least one template is required",
      });
    }
  }

  function handleTemplateChange(index: number, value: string) {
    const newTemplates = [...templates];
    newTemplates[index] = value;
    setTemplates(newTemplates);
  }

  function handleSubmit() {
    // Validation
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Name is required",
      });
      return;
    }

    // Validate all templates
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i].trim();
      if (!template) {
        showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: `Template ${i + 1} cannot be empty`,
        });
        return;
      }

      const validation = validateTemplate(template);
      if (!validation.valid) {
        showToast({
          style: Toast.Style.Failure,
          title: "Template Error",
          message: `Template ${i + 1}: ${validation.error}`,
        });
        return;
      }
    }

    // Check for duplicate name (if editing different group)
    if (existingGroups.some((g) => g.name === name && g.id !== group?.id)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "A template group with this name already exists",
      });
      return;
    }

    // Create or update group
    const newGroup: TemplateGroup = {
      id: group?.id || `template-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      enabled,
      templates: templates.map((t) => t.trim()).filter(Boolean),
    };

    // Update groups list
    const updatedGroups = group
      ? existingGroups.map((g) => (g.id === group.id ? newGroup : g))
      : [...existingGroups, newGroup];

    onSave(updatedGroups);
    showToast({
      style: Toast.Style.Success,
      title: group ? "Template group updated" : "Template group created",
    });
    pop();
  }

  return (
    <Form
      navigationTitle={group ? "Edit Template Group" : "Create Template Group"}
      actions={
        <ActionPanel>
          <Action
            title={group ? "Save Changes" : "Create Template Group"}
            icon={Icon.Check}
            onAction={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Add Template"
            icon={Icon.Plus}
            onAction={handleAddTemplate}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          {templates.map((template, index) =>
            templates.length > 1 ? (
              <Action
                key={index}
                title={`Remove Template ${index + 1}`}
                icon={Icon.MinusCircle}
                style={Action.Style.Destructive}
                onAction={() => handleRemoveTemplate(index)}
                shortcut={
                  index < 9
                    ? ({
                        modifiers: ["cmd", "shift"],
                        key: String(index + 1) as Keyboard.KeyEquivalent,
                      } as Keyboard.Shortcut)
                    : undefined
                }
              />
            ) : null,
          )}
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Template Group"
        text="Create or edit a template group that can generate multiple URL variants from a single URL."
      />
      <Form.Separator />

      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Shorten URL"
        value={name}
        onChange={setName}
        info="A descriptive name for this template group"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Generate shortened URL variants"
        value={description}
        onChange={setDescription}
        info="Optional description of what this template group does"
      />

      <Form.Checkbox
        id="enabled"
        label="Enabled"
        value={enabled}
        onChange={setEnabled}
        info="Disabled template groups won't be used when generating URL variants"
      />

      <Form.Separator />

      <Form.Description
        title="Templates"
        text={`Variables: {{url}}, {{protocol}}, {{host}}, {{path}}, {{query}}, {{hash}}, {{port}}

Path modifiers: {{path:N}} (first N), {{path:-N}} (remove last), {{path:*}} (expand all levels)`}
      />

      {templates.map((template, index) => (
        <Form.TextArea
          key={index}
          id={`template-${index}`}
          title={`Template ${index + 1}`}
          placeholder="e.g., {{protocol}}://{{host}}{{path:*}}"
          value={template}
          onChange={(value) => handleTemplateChange(index, value)}
          info="Use {{variable}} syntax. Available variables: url, protocol, host, path, query, hash, path:*, path:N"
        />
      ))}
    </Form>
  );
}
