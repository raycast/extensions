import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
  popToRoot,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import {
  executePrompt,
  isClaudeInstalled,
  ClaudeResponse,
} from "./lib/claude-cli";
import {
  captureContext,
  formatContextForPrompt,
  CapturedContext,
} from "./lib/context-capture";
import { launchClaudeCode } from "./lib/terminal";

const PROJECT_PATH_STORAGE_KEY = "askClaudeProjectPath";

const MODEL_OPTIONS = [
  { title: "Sonnet (Balanced)", value: "sonnet" },
  { title: "Opus (Most Capable)", value: "opus" },
  { title: "Haiku (Fastest)", value: "haiku" },
];

export default function AskClaude() {
  const [isLoading, setIsLoading] = useState(true);
  const [claudeInstalled, setClaudeInstalled] = useState(true);

  useEffect(() => {
    async function init() {
      const installed = await isClaudeInstalled();
      setClaudeInstalled(installed);
      setIsLoading(false);
    }
    init();
  }, []);

  if (isLoading) {
    return (
      <Form isLoading={true}>
        <Form.Description
          title="Loading"
          text="Checking Claude installation..."
        />
      </Form>
    );
  }

  if (!claudeInstalled) {
    return (
      <Detail
        markdown={`# Claude Code Not Found

Claude Code CLI is not installed or not in your PATH.

## Installation

Run the following command to install Claude Code:

\`\`\`bash
npm install -g @anthropic-ai/claude-code
\`\`\`

## Authentication Setup

After installation, you need to authenticate. Choose **one** of these options:

### Option 1: Anthropic API Key (Pay-as-you-go)
Best for: Developers who want direct API billing

1. Get your API key from [console.anthropic.com](https://console.anthropic.com)
2. Open ClaudeCast preferences (⌘+,)
3. Paste your API key in the "Anthropic API Key" field

### Option 2: OAuth Token (Claude Subscription)
Best for: Claude Pro/Team subscribers

1. Run in terminal: \`claude setup-token\`
2. Follow the prompts to authenticate
3. Copy the generated token
4. Open ClaudeCast preferences (⌘+,)
5. Paste the token in the "OAuth Token" field

---
*Note: The API Key method uses Anthropic's pay-per-use pricing. The OAuth Token method uses your existing Claude subscription.*`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Get Anthropic Api Key"
              url="https://console.anthropic.com/settings/keys"
            />
            <Action.CopyToClipboard
              title="Copy Install Command"
              content="npm install -g @anthropic-ai/claude-code"
            />
            <Action.CopyToClipboard
              title="Copy Setup Token Command"
              content="claude setup-token"
            />
          </ActionPanel>
        }
      />
    );
  }

  return <AskClaudeForm />;
}

function AskClaudeForm() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPath, setIsLoadingPath] = useState(true);
  const [isCapturingContext, setIsCapturingContext] = useState(false);
  const [context, setContext] = useState<CapturedContext | null>(null);
  const defaultProjectPath = `${homedir()}/claudecast`;
  const [projectPath, setProjectPath] = useState(defaultProjectPath);

  // Load saved project path from LocalStorage on mount
  useEffect(() => {
    async function loadSavedPath() {
      try {
        const savedPath = await LocalStorage.getItem<string>(
          PROJECT_PATH_STORAGE_KEY,
        );
        if (savedPath) {
          setProjectPath(savedPath);
        }
      } catch {
        // Ignore errors, use default
      }
      setIsLoadingPath(false);
    }
    loadSavedPath();
  }, []);

  // Save project path to LocalStorage when it changes
  async function handlePathChange(newPath: string) {
    setProjectPath(newPath);
    try {
      await LocalStorage.setItem(PROJECT_PATH_STORAGE_KEY, newPath);
    } catch {
      // Ignore errors saving path
    }
  }

  // Manual context capture
  async function handleCaptureContext() {
    setIsCapturingContext(true);
    try {
      const capturedContext = await captureContext();
      setContext(capturedContext);
      const summary = getContextSummary(capturedContext);
      if (summary) {
        await showToast({
          style: Toast.Style.Success,
          title: "Context captured",
          message: "Selected text and clipboard added",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "No context found",
          message: "No selected text or clipboard content detected",
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to capture context",
      });
    } finally {
      setIsCapturingContext(false);
    }
  }

  const contextSummary = getContextSummary(context);

  async function handleSubmit(values: {
    prompt: string;
    model: string;
    includeContext: boolean;
  }) {
    if (!values.prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a prompt",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine target path (user input or default)
      const targetPath = projectPath || defaultProjectPath;

      // Create directory if it doesn't exist
      if (!existsSync(targetPath)) {
        try {
          mkdirSync(targetPath, { recursive: true });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to create directory",
            message: error instanceof Error ? error.message : String(error),
          });
          setIsSubmitting(false);
          return;
        }
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Asking Claude Code...",
      });

      const contextStr =
        values.includeContext && context
          ? formatContextForPrompt(context)
          : undefined;

      const response = await executePrompt(values.prompt, {
        model: values.model,
        context: contextStr,
        cwd: targetPath,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Response received",
      });

      push(<ResponseView response={response} projectPath={targetPath} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting || isLoadingPath || isCapturingContext}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask Claude Code"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
          <Action
            title="Capture Context"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={handleCaptureContext}
          />
          <Action
            title="Open Full Session"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => {
              const targetPath = projectPath || defaultProjectPath;
              if (!existsSync(targetPath)) {
                mkdirSync(targetPath, { recursive: true });
              }
              await launchClaudeCode({ projectPath: targetPath });
              await popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Ask Claude Code anything..."
        autoFocus
      />

      <Form.Dropdown
        id="model"
        title="Model"
        defaultValue={preferences.defaultModel}
      >
        {MODEL_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="projectPath"
        title="Project Path"
        value={projectPath}
        onChange={handlePathChange}
        placeholder="~/claudecast"
        info="Working directory for Claude Code. Created if it doesn't exist (supports nested paths)."
      />

      <Form.Separator />

      {contextSummary ? (
        <>
          <Form.Checkbox
            id="includeContext"
            label="Include captured context"
            defaultValue={true}
          />
          <Form.Description title="Captured Context" text={contextSummary} />
        </>
      ) : (
        <Form.Description
          title="Context"
          text="Press ⌘G to capture context (adds your currently selected text and recent clipboard entry to the prompt)"
        />
      )}
    </Form>
  );
}

function ResponseView({
  response,
  projectPath,
}: {
  response: ClaudeResponse;
  projectPath?: string;
}) {
  const markdown = formatResponseMarkdown(response);

  const costInfo = response.total_cost_usd
    ? `$${response.total_cost_usd.toFixed(4)}`
    : undefined;

  const usageInfo = response.usage
    ? `${response.usage.input_tokens} in / ${response.usage.output_tokens} out`
    : undefined;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {response.session_id && (
            <Detail.Metadata.Label
              title="Session ID"
              text={response.session_id}
            />
          )}
          {costInfo && <Detail.Metadata.Label title="Cost" text={costInfo} />}
          {usageInfo && (
            <Detail.Metadata.Label title="Tokens" text={usageInfo} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Response">
            <Action.CopyToClipboard
              title="Copy Response"
              content={response.result}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Paste
              title="Paste Response"
              content={response.result}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
                  sessionId: response.session_id,
                });
                await popToRoot();
              }}
            />
            {response.session_id && (
              <Action.CopyToClipboard
                title="Copy Session Id"
                content={response.session_id}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getContextSummary(
  context: CapturedContext | null,
): string | undefined {
  if (!context) return undefined;

  const parts: string[] = [];

  if (context.projectPath) {
    parts.push(`Project: ${context.projectPath}`);
  }

  if (context.currentFile) {
    parts.push(`File: ${context.currentFile}`);
  }

  if (context.gitBranch) {
    parts.push(`Branch: ${context.gitBranch}`);
  }

  if (context.selectedText) {
    const preview = context.selectedText.slice(0, 50);
    parts.push(
      `Selection: "${preview}${context.selectedText.length > 50 ? "..." : ""}"`,
    );
  }

  if (context.clipboard && context.clipboard !== context.selectedText) {
    const preview = context.clipboard.slice(0, 30);
    parts.push(
      `Clipboard: "${preview}${context.clipboard.length > 30 ? "..." : ""}"`,
    );
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

function formatResponseMarkdown(response: ClaudeResponse): string {
  let md = "";

  if (response.is_error) {
    md += `> **Error**: The response may contain error information.\n\n`;
  }

  md += response.result;

  return md;
}
