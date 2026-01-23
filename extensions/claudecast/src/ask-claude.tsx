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
} from "@raycast/api";
import { useState, useEffect } from "react";
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

const MODEL_OPTIONS = [
  { title: "Sonnet (Balanced)", value: "sonnet" },
  { title: "Opus (Most Capable)", value: "opus" },
  { title: "Haiku (Fastest)", value: "haiku" },
];

export default function AskClaude() {
  const [isLoading, setIsLoading] = useState(true);
  const [claudeInstalled, setClaudeInstalled] = useState(true);
  const [context, setContext] = useState<CapturedContext | null>(null);

  useEffect(() => {
    async function init() {
      const [installed, capturedContext] = await Promise.all([
        isClaudeInstalled(),
        captureContext(),
      ]);
      setClaudeInstalled(installed);
      setContext(capturedContext);
      setIsLoading(false);
    }
    init();
  }, []);

  if (isLoading) {
    return (
      <Form isLoading={true}>
        <Form.Description title="Loading" text="Capturing context..." />
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

Or with Homebrew:

\`\`\`bash
brew install claude-code
\`\`\`

After installation, you may need to configure the path in the extension preferences if it's not automatically detected.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Installation Guide"
              url="https://docs.anthropic.com/claude-code/installation"
            />
            <Action.CopyToClipboard
              title="Copy Install Command"
              content="npm install -g @anthropic-ai/claude-code"
            />
          </ActionPanel>
        }
      />
    );
  }

  return <AskClaudeForm context={context} />;
}

function AskClaudeForm({ context }: { context: CapturedContext | null }) {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        cwd: context?.projectPath,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Response received",
      });

      push(
        <ResponseView response={response} projectPath={context?.projectPath} />,
      );
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
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask Claude Code"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Full Session"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={async () => {
              await launchClaudeCode({ projectPath: context?.projectPath });
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

      {contextSummary && (
        <>
          <Form.Separator />
          <Form.Checkbox
            id="includeContext"
            label="Include captured context"
            defaultValue={true}
            info={contextSummary}
          />
          <Form.Description title="Context" text={contextSummary} />
        </>
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
