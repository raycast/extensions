import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Form,
  Clipboard,
  showHUD,
  LocalStorage,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  isCustom?: boolean;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "code-review",
    name: "Code Review",
    description: "Request a code review with best practices",
    template: `Review the following code for:
- Code quality and best practices
- Potential bugs or issues
- Performance improvements
- Security concerns

Code:
{input}`,
  },
  {
    id: "explain-code",
    name: "Explain Code",
    description: "Get a clear explanation of code",
    template: `Explain the following code in detail:
- What it does and how it works
- Key concepts and patterns used
- Any important considerations

Code:
{input}`,
  },
  {
    id: "refactor",
    name: "Refactor Code",
    description: "Refactor code for better quality",
    template: `Refactor the following code to improve:
- Readability and maintainability
- Performance where possible
- Following best practices

Keep the same functionality. Provide the refactored code with comments.

Code:
{input}`,
  },
  {
    id: "write-tests",
    name: "Write Tests",
    description: "Generate unit tests for code",
    template: `Write comprehensive unit tests for the following code:
- Cover all main functionality
- Include edge cases
- Use appropriate testing patterns

Code:
{input}`,
  },
  {
    id: "debug",
    name: "Debug Help",
    description: "Get help debugging an issue",
    template: `Help me debug the following issue:

{input}

Provide possible causes, debugging steps, and potential solutions.`,
  },
  {
    id: "summarize",
    name: "Summarize",
    description: "Summarize content concisely",
    template: `Summarize the following content with key points and actionable takeaways:

{input}`,
  },
];

const CUSTOM_TEMPLATES_KEY = "custom_templates";

async function getCustomTemplates(): Promise<PromptTemplate[]> {
  const data = await LocalStorage.getItem<string>(CUSTOM_TEMPLATES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as PromptTemplate[];
  } catch {
    return [];
  }
}

async function saveCustomTemplates(templates: PromptTemplate[]): Promise<void> {
  await LocalStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

export default function UseTemplateCommand() {
  const [templates, setTemplates] =
    useState<PromptTemplate[]>(DEFAULT_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      const custom = await getCustomTemplates();
      setTemplates([
        ...DEFAULT_TEMPLATES,
        ...custom.map((t) => ({ ...t, isCustom: true })),
      ]);
      setIsLoading(false);
    }
    loadTemplates();
  }, []);

  async function handleDelete(template: PromptTemplate) {
    if (!template.isCustom) return;

    const confirmed = await confirmAlert({
      title: "Delete Template?",
      message: `Delete "${template.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (confirmed) {
      const custom = await getCustomTemplates();
      const filtered = custom.filter((t) => t.id !== template.id);
      await saveCustomTemplates(filtered);
      setTemplates([
        ...DEFAULT_TEMPLATES,
        ...filtered.map((t) => ({ ...t, isCustom: true })),
      ]);
      await showToast({
        style: Toast.Style.Success,
        title: "Template deleted",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search templates...">
      <List.Section title="Templates">
        {templates.map((template) => (
          <List.Item
            key={template.id}
            icon={template.isCustom ? Icon.Person : Icon.Document}
            title={template.name}
            subtitle={template.description}
            accessories={template.isCustom ? [{ tag: "Custom" }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Use Template"
                  icon={Icon.Clipboard}
                  target={<TemplateInputView template={template} />}
                />
                {template.isCustom && (
                  <Action
                    title="Delete Template"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(template)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Custom Template"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Template"
                icon={Icon.Plus}
                target={
                  <CreateTemplateView
                    onCreated={() => {
                      getCustomTemplates().then((custom) => {
                        setTemplates([
                          ...DEFAULT_TEMPLATES,
                          ...custom.map((t) => ({ ...t, isCustom: true })),
                        ]);
                      });
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function TemplateInputView({ template }: { template: PromptTemplate }) {
  const [input, setInput] = useState("");

  async function handleApply() {
    if (!input.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter your input",
      });
      return;
    }

    const result = template.template.replace("{input}", input.trim());
    await Clipboard.copy(result);
    await showHUD("📋 Prompt copied to clipboard!");
  }

  async function handlePaste() {
    if (!input.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter your input",
      });
      return;
    }

    const result = template.template.replace("{input}", input.trim());
    await Clipboard.paste(result);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Copy Prompt"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handleApply}
          />
          <Action
            title="Paste Prompt"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={handlePaste}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Template" text={template.name} />
      <Form.TextArea
        id="input"
        title="Your Content"
        placeholder="Paste your code, text, or content here..."
        value={input}
        onChange={setInput}
        autoFocus
      />
      <Form.Description
        title="Preview"
        text={template.template.replace("{input}", "...your content...")}
      />
    </Form>
  );
}

function CreateTemplateView({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");
  const { pop } = useNavigation();

  async function handleCreate() {
    if (!name.trim() || !template.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name and template are required",
      });
      return;
    }

    if (!template.includes("{input}")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Template must include {input}",
        message: "Use {input} as placeholder for user content",
      });
      return;
    }

    const custom = await getCustomTemplates();
    const newTemplate: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "Custom template",
      template: template.trim(),
      isCustom: true,
    };

    await saveCustomTemplates([...custom, newTemplate]);
    await showToast({ style: Toast.Style.Success, title: "Template created!" });
    onCreated();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Create Template"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handleCreate}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g., Bug Report"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g., Format a bug report"
        value={description}
        onChange={setDescription}
      />
      <Form.TextArea
        id="template"
        title="Template"
        placeholder={`Use {input} where content should go, e.g.:

Analyze this bug report:

{input}

Provide steps to reproduce and potential fixes.`}
        value={template}
        onChange={setTemplate}
      />
      <Form.Description
        title="Note"
        text="Use {input} as placeholder for where your content will be inserted."
      />
    </Form>
  );
}
