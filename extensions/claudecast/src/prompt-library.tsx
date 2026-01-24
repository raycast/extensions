import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  getAllPrompts,
  PromptTemplate,
  PromptCategory,
  getCategoryInfo,
  getPromptsByCategory,
  substituteVariables,
  incrementUsageCount,
  deleteCustomPrompt,
} from "./lib/prompts";
import { executePrompt, ClaudeResponse } from "./lib/claude-cli";
import { captureContext, getCodeContext } from "./lib/context-capture";
import { launchClaudeCode } from "./lib/terminal";

const CATEGORIES: PromptCategory[] = [
  "planning",
  "tdd",
  "review",
  "refactoring",
  "debugging",
  "docs",
  "advanced",
];

// Convert camelCase to Title Case (e.g., "projectPath" -> "Project Path")
function formatVariableName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1") // Add space before capitals
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

export default function PromptLibrary() {
  const [isLoading, setIsLoading] = useState(true);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [filterCategory, setFilterCategory] = useState<
    PromptCategory | "all" | "frequent"
  >("all");

  async function loadPrompts() {
    setIsLoading(true);
    const allPrompts = await getAllPrompts();
    setPrompts(allPrompts);
    setIsLoading(false);
  }

  useEffect(() => {
    loadPrompts();
  }, []);

  function getFilteredPrompts(): PromptTemplate[] {
    if (filterCategory === "all") {
      return prompts;
    }
    if (filterCategory === "frequent") {
      return [...prompts]
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);
    }
    return getPromptsByCategory(prompts, filterCategory);
  }

  const filteredPrompts = getFilteredPrompts();

  // Group by category if showing all
  const groupedPrompts =
    filterCategory === "all"
      ? CATEGORIES.reduce(
          (acc, cat) => {
            const catPrompts = getPromptsByCategory(filteredPrompts, cat);
            if (catPrompts.length > 0) {
              acc[cat] = catPrompts;
            }
            return acc;
          },
          {} as Record<PromptCategory, PromptTemplate[]>,
        )
      : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search prompts..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          onChange={(value) =>
            setFilterCategory(value as PromptCategory | "all" | "frequent")
          }
        >
          <List.Dropdown.Item title="All Prompts" value="all" />
          <List.Dropdown.Item title="Frequently Used" value="frequent" />
          <List.Dropdown.Section title="Categories">
            {CATEGORIES.map((cat) => {
              const info = getCategoryInfo(cat);
              return (
                <List.Dropdown.Item
                  key={cat}
                  icon={{ source: info.icon, tintColor: info.tintColor }}
                  title={info.name}
                  value={cat}
                />
              );
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {groupedPrompts
        ? // Show grouped by category
          Object.entries(groupedPrompts).map(([category, catPrompts]) => {
            const info = getCategoryInfo(category as PromptCategory);
            return (
              <List.Section
                key={category}
                title={info.name}
                subtitle={`${catPrompts.length} prompts`}
              >
                {catPrompts.map((prompt) => (
                  <PromptItem
                    key={prompt.id}
                    prompt={prompt}
                    onRefresh={loadPrompts}
                  />
                ))}
              </List.Section>
            );
          })
        : // Show flat list
          filteredPrompts.map((prompt) => (
            <PromptItem
              key={prompt.id}
              prompt={prompt}
              onRefresh={loadPrompts}
            />
          ))}

      {!isLoading && filteredPrompts.length === 0 && (
        <List.EmptyView
          title="No Prompts Found"
          description="Try a different category or search term"
          icon={Icon.Document}
        />
      )}
    </List>
  );
}

function PromptItem({
  prompt,
  onRefresh,
}: {
  prompt: PromptTemplate;
  onRefresh: () => void;
}) {
  const { push } = useNavigation();
  const info = getCategoryInfo(prompt.category);

  const accessories: List.Item.Accessory[] = [];

  if (prompt.usageCount > 0) {
    accessories.push({
      text: `${prompt.usageCount}x`,
      tooltip: `Used ${prompt.usageCount} times`,
    });
  }

  if (prompt.model) {
    accessories.push({
      tag: {
        value: prompt.model,
        color:
          prompt.model === "opus"
            ? Color.Purple
            : prompt.model === "haiku"
              ? Color.Green
              : Color.Blue,
      },
    });
  }

  if (!prompt.isBuiltIn) {
    accessories.push({
      tag: { value: "Custom", color: Color.Orange },
    });
  }

  async function runInTerminal(variables: Record<string, string> = {}) {
    const context = await captureContext();
    const fullPrompt = substituteVariables(prompt.prompt, variables);
    await incrementUsageCount(prompt.id);
    await launchClaudeCode({
      projectPath: context.projectPath,
      prompt: fullPrompt,
    });
    await popToRoot();
  }

  return (
    <List.Item
      title={prompt.name}
      subtitle={prompt.description}
      icon={{
        source: prompt.icon || info.icon,
        tintColor: prompt.tintColor || info.tintColor,
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Execute">
            {prompt.variables.length > 0 ? (
              <Action.Push
                title="Run in Terminal"
                icon={Icon.Terminal}
                target={<PromptVariablesForm prompt={prompt} mode="terminal" />}
              />
            ) : (
              <Action
                title="Run in Terminal"
                icon={Icon.Terminal}
                onAction={() => runInTerminal()}
              />
            )}
            {prompt.variables.length > 0 ? (
              <Action.Push
                title="Quick Execute in Raycast"
                icon={Icon.Play}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<PromptVariablesForm prompt={prompt} mode="raycast" />}
              />
            ) : (
              <Action
                title="Quick Execute in Raycast"
                icon={Icon.Play}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={async () => {
                  push(<ExecutingPromptView prompt={prompt} variables={{}} />);
                }}
              />
            )}
            <Action.Push
              title="View Prompt"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<PromptDetailView prompt={prompt} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            <Action.CopyToClipboard
              title="Copy Prompt"
              content={prompt.prompt}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {!prompt.isBuiltIn && (
              <Action
                title="Delete Prompt"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  await deleteCustomPrompt(prompt.id);
                  onRefresh();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Prompt deleted",
                  });
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PromptDetailView({ prompt }: { prompt: PromptTemplate }) {
  const info = getCategoryInfo(prompt.category);

  const markdown = `# ${prompt.icon || info.icon} ${prompt.name}

${prompt.description}

---

## Prompt Template

\`\`\`
${prompt.prompt}
\`\`\`

${
  prompt.variables.length > 0
    ? `
## Variables

${prompt.variables.map((v) => `- **{{${v.name}}}**: ${v.description}${v.default ? ` (default: ${v.default})` : ""}`).join("\n")}
`
    : ""
}

${
  prompt.systemPrompt
    ? `
## System Prompt

\`\`\`
${prompt.systemPrompt}
\`\`\`
`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Category" text={info.name} />
          {prompt.model && (
            <Detail.Metadata.Label title="Model" text={prompt.model} />
          )}
          <Detail.Metadata.Label
            title="Usage"
            text={`${prompt.usageCount} times`}
          />
          <Detail.Metadata.Label
            title="Type"
            text={prompt.isBuiltIn ? "Built-in" : "Custom"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {prompt.variables.length > 0 ? (
            <Action.Push
              title="Use Prompt"
              icon={Icon.Play}
              target={<PromptVariablesForm prompt={prompt} />}
            />
          ) : (
            <Action.Push
              title="Execute Prompt"
              icon={Icon.Play}
              target={<ExecutingPromptView prompt={prompt} variables={{}} />}
            />
          )}
          <Action.CopyToClipboard title="Copy Prompt" content={prompt.prompt} />
        </ActionPanel>
      }
    />
  );
}

function PromptVariablesForm({
  prompt,
  mode = "terminal",
}: {
  prompt: PromptTemplate;
  mode?: "terminal" | "raycast";
}) {
  const { push } = useNavigation();
  const [codeContext, setCodeContext] = useState<string | undefined>();
  // Track which code variables are using path input mode
  const [inputModes, setInputModes] = useState<Record<string, "code" | "path">>(
    {},
  );

  useEffect(() => {
    getCodeContext().then(setCodeContext);
  }, []);

  async function handleSubmit(values: Record<string, string | string[]>) {
    // Process values - handle file picker arrays
    const processedValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (Array.isArray(value)) {
        // FilePicker returns an array of paths
        processedValues[key] = value[0] || "";
      } else {
        processedValues[key] = value;
      }
    }

    // Check if all required variables are provided (skip optional path variables)
    for (const variable of prompt.variables) {
      const isOptionalPath = variable.type === "path";
      if (
        !processedValues[variable.name]?.trim() &&
        !variable.default &&
        !isOptionalPath
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Please provide ${variable.name}`,
        });
        return;
      }
    }

    if (mode === "terminal") {
      // Run in terminal
      const context = await captureContext();
      const fullPrompt = substituteVariables(prompt.prompt, processedValues);
      await incrementUsageCount(prompt.id);
      // Use user-specified projectPath if provided, otherwise fall back to context
      const targetPath = processedValues.projectPath || context.projectPath;
      await launchClaudeCode({
        projectPath: targetPath,
        prompt: fullPrompt,
      });
      await popToRoot();
    } else {
      // Run in Raycast
      push(<ExecutingPromptView prompt={prompt} variables={processedValues} />);
    }
  }

  const submitTitle = mode === "terminal" ? "Run in Terminal" : "Execute";
  const submitIcon = mode === "terminal" ? Icon.Terminal : Icon.Play;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={submitIcon}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Prompt" text={prompt.name} />

      {prompt.variables.map((variable) => {
        // For path type variables (like projectPath), show FilePicker
        if (variable.type === "path") {
          return (
            <Form.FilePicker
              key={variable.name}
              id={variable.name}
              title={formatVariableName(variable.name)}
              info={variable.description}
              allowMultipleSelection={false}
              canChooseDirectories={variable.allowDirectories !== false}
              canChooseFiles={!variable.allowDirectories}
            />
          );
        }

        // For code variables that allow repository path
        if (
          (variable.type === "code" ||
            variable.name.toLowerCase().includes("code")) &&
          variable.allowRepositoryPath
        ) {
          const currentMode = inputModes[variable.name] || "code";
          return (
            <React.Fragment key={variable.name}>
              <Form.Dropdown
                id={`${variable.name}_mode`}
                title={`${formatVariableName(variable.name)} Input Type`}
                value={currentMode}
                onChange={(value) => {
                  setInputModes((prev) => ({
                    ...prev,
                    [variable.name]: value as "code" | "path",
                  }));
                }}
                info="Choose to paste code or select a repository folder"
              >
                <Form.Dropdown.Item
                  value="code"
                  title="Paste Code"
                  icon={Icon.Code}
                />
                <Form.Dropdown.Item
                  value="path"
                  title="Repository Path"
                  icon={Icon.Folder}
                />
              </Form.Dropdown>
              {currentMode === "code" ? (
                <Form.TextArea
                  id={variable.name}
                  title={formatVariableName(variable.name)}
                  placeholder={variable.description}
                  defaultValue={codeContext || variable.default}
                  info={variable.description}
                />
              ) : (
                <Form.FilePicker
                  id={variable.name}
                  title={formatVariableName(variable.name)}
                  info={`Select a repository folder for: ${variable.description}`}
                  allowMultipleSelection={false}
                  canChooseDirectories={true}
                  canChooseFiles={false}
                />
              )}
            </React.Fragment>
          );
        }

        // For code variables without repository path option
        if (
          variable.type === "code" ||
          variable.name.toLowerCase().includes("code")
        ) {
          return (
            <Form.TextArea
              key={variable.name}
              id={variable.name}
              title={formatVariableName(variable.name)}
              placeholder={variable.description}
              defaultValue={codeContext || variable.default}
              info={variable.description}
            />
          );
        }

        // For selection variables, also use TextArea
        if (variable.type === "selection") {
          return (
            <Form.TextArea
              key={variable.name}
              id={variable.name}
              title={formatVariableName(variable.name)}
              placeholder={variable.description}
              defaultValue={codeContext || variable.default}
              info={variable.description}
            />
          );
        }

        // Default to text field
        return (
          <Form.TextField
            key={variable.name}
            id={variable.name}
            title={formatVariableName(variable.name)}
            placeholder={variable.description}
            defaultValue={variable.default}
            info={variable.description}
          />
        );
      })}
    </Form>
  );
}

function ExecutingPromptView({
  prompt,
  variables,
}: {
  prompt: PromptTemplate;
  variables: Record<string, string>;
}) {
  // Uses auto-generated Preferences type from raycast-env.d.ts
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ClaudeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string | undefined>();
  // Track if we've already executed to prevent re-running on re-renders
  const hasExecutedRef = React.useRef(false);

  useEffect(() => {
    // Guard against re-execution (React 18 strict mode or re-renders)
    if (hasExecutedRef.current) {
      return;
    }
    hasExecutedRef.current = true;

    async function execute() {
      try {
        // Get project context
        const context = await captureContext();
        setProjectPath(context.projectPath);

        // Substitute variables
        const fullPrompt = substituteVariables(prompt.prompt, variables);

        // Execute
        const response = await executePrompt(fullPrompt, {
          model: prompt.model || preferences.defaultModel,
          cwd: context.projectPath,
        });

        // Track usage
        await incrementUsageCount(prompt.id);

        setResult(response);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    }

    execute();
    // Run only once on mount - variables are captured in closure
    // eslint-disable-next-line
  }, []);

  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown={`# Executing: ${prompt.name}\n\nProcessing your request...`}
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={error} />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `# ${prompt.name}\n\n${result?.result || "No response"}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {result?.total_cost_usd && (
            <Detail.Metadata.Label
              title="Cost"
              text={`$${result.total_cost_usd.toFixed(4)}`}
            />
          )}
          {result?.usage && (
            <Detail.Metadata.Label
              title="Tokens"
              text={`${result.usage.input_tokens} in / ${result.usage.output_tokens} out`}
            />
          )}
          {result?.session_id && (
            <Detail.Metadata.Label title="Session" text={result.session_id} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Response">
            <Action.CopyToClipboard
              title="Copy Response"
              content={result?.result || ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Paste
              title="Paste Response"
              content={result?.result || ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Session">
            <Action
              title="Continue in Terminal"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={async () => {
                await launchClaudeCode({
                  projectPath,
                  sessionId: result?.session_id,
                });
                await popToRoot();
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
