import { Form, ActionPanel, Action, Detail, showToast, Toast, useNavigation, popToRoot } from "@raycast/api";
import { useState } from "react";
import { useGraphsConfig } from "./utils";
import { detectCapabilities } from "./roamApi";

function buildOnboardingMarkdown(
  graphName: string,
  capabilities: { read: boolean; append: boolean; edit: boolean }
): string {
  const canRead = capabilities.read;
  const canAppend = capabilities.append;
  const fullAccess = canRead && canAppend;

  const accessLevel = fullAccess ? "read & edit" : canRead ? "read-only" : "append-only";

  let md = `## Graph "${graphName}" connected — ${accessLevel}\n\n`;

  if (fullAccess) {
    md += `Your token has full access. All commands are available.\n\n`;
    md += `### Available commands\n\n`;
    md += `Search for **"Roam Research"** in Raycast to find all commands:\n\n`;
    md += `- **Search** — find blocks and pages across your graph\n`;
    md += `- **Quick Capture** — append notes using capture templates\n`;
    md += `- **Instant Capture** — zero-UI capture (assign a hotkey for fastest access)\n`;
    md += `- **Random Note** — surface a random block for review\n`;
    md += `\n`;
    md += `### Key concepts\n\n`;
    md += `**Capture templates** — Customize how captured notes are formatted and where they go. `;
    md += `Use the "Manage Capture Templates" command to create presets for different workflows — `;
    md += `daily notes, TODOs, meeting notes, etc. Templates can target a specific page, nest under a parent block, and auto-add tags.\n\n`;
    md += `**Instant Capture** — To use Instant Capture, set a graph-specific template as your Instant Capture template in Manage Capture Templates. `;
    md += `With a single graph and a single template, Instant Capture works automatically.\n`;
  } else if (canRead) {
    md += `Your token has read-only access.\n\n`;
    md += `### Available commands\n\n`;
    md += `- **Search** — find blocks and pages across your graph\n`;
    md += `- **Random Note** — surface a random block for review\n`;
    md += `\n`;
    md += `Quick Capture and Instant Capture are not available with a read-only token. `;
    md += `To enable capture, create a new token with "read & edit" or "append-only" access in Roam.\n`;
  } else {
    md += `Your token has append-only access. This is typical for encrypted graphs.\n\n`;
    md += `### Available commands\n\n`;
    md += `- **Quick Capture** — append notes using capture templates\n`;
    md += `- **Instant Capture** — zero-UI capture (assign a hotkey for fastest access)\n`;
    md += `\n`;
    md += `Search and Random Note are not available with an append-only token.\n\n`;
    md += `### Key concepts\n\n`;
    md += `**Capture templates** — Customize how captured notes are formatted and where they go. `;
    md += `Use the "Manage Capture Templates" command to create presets — `;
    md += `daily notes, TODOs, meeting notes, etc.\n\n`;
    md += `**Instant Capture** — To use Instant Capture, set a graph-specific template as your Instant Capture template in Manage Capture Templates. `;
    md += `With a single graph and a single template, Instant Capture works automatically.\n`;
  }

  return md;
}

const GENERAL_ONBOARDING_MARKDOWN = `## Roam Research for Raycast

Search for **"Roam Research"** in Raycast to find all commands.

### Commands

- **Roam Research** (this screen) — manage your connected graphs
- **Search** — find blocks and pages. Works across all graphs at once, or within a specific graph.
- **Quick Capture** — append notes to a graph using capture templates. Type your content first, then pick a template and graph.
- **Instant Capture** — zero-UI capture. Assign a hotkey for fastest access.
- **Manage Capture Templates** — create reusable presets for different capture workflows (daily notes, TODOs, meeting notes, etc.)
- **Random Note** — surface a random block from a graph for review
- **Capture Outbox** — view capture history and pending items that will be retried automatically

### Key concepts

**Multiple graphs** — You can connect as many graphs as you want. Each graph needs its own API token. Commands like Search work across all graphs simultaneously.

**Capture templates** — Control how notes are formatted and where they go. Templates can target a specific page, nest under a parent block, and auto-add tags. Templates can be universal (work with any graph) or pinned to a specific graph.

**Instant Capture** — To use Instant Capture, set a graph-specific template as your Instant Capture template in Manage Capture Templates. With a single graph and a single template, Instant Capture works automatically.

**Encrypted graphs** — Supported for capture via append-only tokens. Search and Random Note require an unencrypted graph.
`;

export const GeneralOnboardingDetail = () => {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle="Getting Started"
      markdown={GENERAL_ONBOARDING_MARKDOWN}
      actions={
        <ActionPanel>
          <Action title="Done" onAction={pop} />
        </ActionPanel>
      }
    />
  );
};

export const GraphOnboardingDetail = ({
  graphName,
  capabilities,
  onDone,
}: {
  graphName: string;
  capabilities: { read: boolean; append: boolean; edit: boolean };
  onDone?: () => void;
}) => {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle={`Graph "${graphName}" — Getting Started`}
      markdown={buildOnboardingMarkdown(graphName, capabilities)}
      actions={
        <ActionPanel>
          <Action title="Done" onAction={onDone || pop} />
        </ActionPanel>
      }
    />
  );
};

const GRAPH_NAME_INVALID_CHARS = /[^A-Za-z0-9_-]/;
const LOOKS_LIKE_EMAIL = /@/;
const LOOKS_LIKE_URL = /^https?:\/\//;

export function NewGraph({
  parentSaveGraphConfig,
}: {
  /** When provided, uses the parent's saveGraphConfig so the parent list re-renders when navigating back. */
  parentSaveGraphConfig?: (obj: GraphConfig) => void;
} = {}) {
  const { graphsConfig, saveGraphConfig: localSaveGraphConfig } = useGraphsConfig();
  const saveGraphConfig = parentSaveGraphConfig || localSaveGraphConfig;
  const { push } = useNavigation();

  const [nameError, setNameError] = useState<string | undefined>();
  function dropGraphNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  const [tokenError, setTokenError] = useState<string | undefined>();
  function dropGraphTokenErrorIfNeeded() {
    if (tokenError && tokenError.length > 0) {
      setTokenError(undefined);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Graph"
            onSubmit={async (values) => {
              if (!values["nameField"]) {
                showToast({
                  title: "Warning",
                  message: `Graph name shouldn't be empty!`,
                  style: Toast.Style.Failure,
                });
                return;
              }
              if (!values["tokenField"]) {
                showToast({
                  title: "Warning",
                  message: `Graph token shouldn't be empty!`,
                  style: Toast.Style.Failure,
                });
                return;
              }
              if (LOOKS_LIKE_EMAIL.test(values["nameField"])) {
                showToast({
                  title: "Not an email",
                  message: "Enter your graph name, not your email (e.g. my-graph).",
                  style: Toast.Style.Failure,
                });
                return;
              }
              if (LOOKS_LIKE_URL.test(values["nameField"])) {
                showToast({
                  title: "Not a URL",
                  message: "Enter just the graph name (e.g. my-graph).",
                  style: Toast.Style.Failure,
                });
                return;
              }
              if (GRAPH_NAME_INVALID_CHARS.test(values["nameField"])) {
                showToast({
                  title: "Warning",
                  message: "Names can only contain letters, numbers, dashes and underscores.",
                  style: Toast.Style.Failure,
                });
                return;
              }
              if (Object.prototype.hasOwnProperty.call(graphsConfig, values["nameField"])) {
                showToast({
                  title: "Warning",
                  message: `Graph "${values["nameField"]}" is already set up!`,
                  style: Toast.Style.Failure,
                });
                return;
              }
              if (!values["tokenField"].startsWith("roam-graph-token-")) {
                showToast({
                  title: "Warning",
                  message: "Token should start with 'roam-graph-token-'",
                  style: Toast.Style.Failure,
                });
                return;
              }

              const graphName = values.nameField;
              const graphToken = values.tokenField;

              const toast = await showToast({
                title: "Detecting token capabilities...",
                style: Toast.Style.Animated,
              });

              try {
                const { capabilities, readError, appendError } = await detectCapabilities(graphName, graphToken);

                if (!capabilities.read && !capabilities.append) {
                  const isPermissionError = (e: unknown) => {
                    const msg = String((e as any)?.message || e || "");
                    return msg.includes("Invalid token") || msg.includes("Insufficient permissions");
                  };
                  const errors = [readError, appendError].filter(Boolean);
                  const allPermission = errors.length > 0 && errors.every(isPermissionError);

                  toast.style = Toast.Style.Failure;
                  toast.title = 'Failed to validate graph "' + graphName + '"';
                  toast.message = allPermission
                    ? "Please check name and token and try again."
                    : "Connection failed — please check your network and try again.";
                  return;
                }

                saveGraphConfig({ ...values, capabilities } as GraphConfig);

                toast.hide();
                push(<GraphOnboardingDetail graphName={graphName} capabilities={capabilities} onDone={popToRoot} />);
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = 'Failed to validate graph "' + graphName + '"';
                toast.message = "Connection failed — please check your network and try again.";
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Graph name"
        placeholder="e.g. my-graph-name"
        error={nameError}
        onChange={dropGraphNameErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            if (LOOKS_LIKE_EMAIL.test(value)) {
              setNameError("This looks like an email — enter your graph name instead (e.g. my-graph).");
            } else if (LOOKS_LIKE_URL.test(value)) {
              setNameError("This looks like a URL — enter just the graph name (e.g. my-graph).");
            } else if (GRAPH_NAME_INVALID_CHARS.test(value)) {
              setNameError("Names can only contain letters, numbers, dashes and underscores.");
            } else if (Object.prototype.hasOwnProperty.call(graphsConfig, value)) {
              setNameError(`"${value}" is already set up!`);
            } else {
              dropGraphNameErrorIfNeeded();
            }
          } else {
            setNameError("The field shouldn't be empty!");
          }
        }}
      />
      <Form.PasswordField
        id="tokenField"
        title="API Token"
        placeholder="roam-graph-token-..."
        error={tokenError}
        onChange={dropGraphTokenErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (!value || value.length === 0) {
            setTokenError("The field shouldn't be empty!");
          } else if (!value.startsWith("roam-graph-token-")) {
            setTokenError("Token should start with 'roam-graph-token-'");
          } else {
            dropGraphTokenErrorIfNeeded();
          }
        }}
      />
      <Form.Description
        title=""
        text={`This is an API token — not your Roam password.

To create one: open your graph in Roam → ··· → Settings → Graph tab → API Tokens → "+ New API Token" → Create → copy the token.

Access Scope:
  • "read & edit" — search + capture (recommended)
  • "read-only" — search and random notes only
  • "append-only" — capture only (the only option for encrypted graphs)`}
      />
    </Form>
  );
}

export default NewGraph;
