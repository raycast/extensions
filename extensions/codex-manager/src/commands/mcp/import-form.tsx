import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import type { McpServerDoc } from "@/types";
import { getMcpServers, setMcpServer } from "@/lib/mcp";
import { expandTilde, pathExists } from "@/lib/paths";
import { readTomlConfig, writeTomlConfig } from "@/lib/toml";
import { validateMcpServer } from "@/lib/validate";

type McpImportFormProps = {
  onSaved?: () => void | Promise<void>;
};

type FormValues = {
  json: string;
};

type ImportPayload =
  | { mode: "single"; name?: string; server: McpServerDoc }
  | { mode: "bulk"; servers: Record<string, McpServerDoc> };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseImportPayload(text: string): ImportPayload {
  const parsed = JSON.parse(text);
  if (!isPlainObject(parsed)) {
    throw new Error("JSON must be an object.");
  }

  const knownServerKeys = new Set(["command", "args", "env", "cwd", "enabled", "description"]);
  const bulkKey = ["mcp_servers", "mcpServers", "mcp"].find((key) => isPlainObject(parsed[key]));
  if (bulkKey) {
    return {
      mode: "bulk",
      servers: parsed[bulkKey] as Record<string, McpServerDoc>,
    };
  }

  const entries = Object.entries(parsed);
  if (
    entries.length > 1 &&
    entries.every(([, value]) => isPlainObject(value)) &&
    !entries.some(([key]) => knownServerKeys.has(key))
  ) {
    return {
      mode: "bulk",
      servers: parsed as Record<string, McpServerDoc>,
    };
  }

  if (typeof parsed.name === "string") {
    if (isPlainObject(parsed.server)) {
      return {
        mode: "single",
        name: parsed.name,
        server: parsed.server as McpServerDoc,
      };
    }

    const { name, ...rest } = parsed;
    return {
      mode: "single",
      name,
      server: rest as McpServerDoc,
    };
  }

  if (entries.length === 1) {
    const [name, server] = entries[0];
    if (!isPlainObject(server)) {
      throw new Error("JSON object value must be an object with server fields.");
    }
    return {
      mode: "single",
      name,
      server: server as McpServerDoc,
    };
  }

  return {
    mode: "single",
    server: parsed as McpServerDoc,
  };
}

export default function McpImportForm({ onSaved }: McpImportFormProps) {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = expandTilde(preferences.configPath);
  const { pop } = useNavigation();
  const [jsonValue, setJsonValue] = useState("");
  const [jsonError, setJsonError] = useState<string | undefined>(undefined);

  async function handleSubmit(values: FormValues) {
    if (!values.json.trim()) {
      setJsonError("JSON is required");
      await showToast({
        style: Toast.Style.Failure,
        title: "JSON is required",
      });
      return;
    }

    let payload: ImportPayload;
    try {
      payload = parseImportPayload(values.json);
      setJsonError(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON.";
      setJsonError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message,
      });
      return;
    }

    try {
      let doc: Record<string, unknown> = {};
      const exists = await pathExists(configPath);
      if (exists) {
        const loaded = await readTomlConfig(configPath);
        doc = loaded.doc;
      } else {
        doc = { mcp_servers: {} };
      }

      const servers = getMcpServers(doc);
      if (payload.mode === "bulk") {
        const errors: string[] = [];
        for (const [serverName, server] of Object.entries(payload.servers)) {
          errors.push(...validateMcpServer(serverName, server).map((error) => `${serverName}: ${error}`));
        }
        if (errors.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation failed",
            message: errors.join(" "),
          });
          return;
        }

        const conflicting = Object.keys(payload.servers).filter((serverName) => Boolean(servers[serverName]));
        if (conflicting.length > 0) {
          const confirmed = await confirmAlert({
            title: `Overwrite ${conflicting.length} servers?`,
            message: `This will replace existing MCP servers with the same name.\n\n${conflicting
              .map((name) => `- ${name}`)
              .join("\n")}`,
            primaryAction: {
              title: "Overwrite",
              style: Alert.ActionStyle.Destructive,
            },
          });
          if (!confirmed) {
            return;
          }
        }

        for (const [serverName, server] of Object.entries(payload.servers)) {
          setMcpServer(doc, serverName, server);
        }
      } else {
        const name = payload.name?.trim() ?? "";
        if (!name) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Name is required",
          });
          return;
        }

        const errors = validateMcpServer(name, payload.server);
        if (errors.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation failed",
            message: errors.join(" "),
          });
          return;
        }

        const nameExists = Boolean(servers[name]);
        if (nameExists) {
          const confirmed = await confirmAlert({
            title: `Overwrite ${name}?`,
            message: "This will replace the existing MCP server.",
            primaryAction: {
              title: "Overwrite",
              style: Alert.ActionStyle.Destructive,
            },
          });
          if (!confirmed) {
            return;
          }
        }

        setMcpServer(doc, name, payload.server);
      }
      await writeTomlConfig(configPath, doc, preferences.createBackup);

      await showToast({
        style: Toast.Style.Success,
        title: buildSuccessMessage(payload),
      });
      if (onSaved) {
        await onSaved();
      }
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to import",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Import MCP Server from JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (!text?.trim()) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Clipboard is empty",
                });
                return;
              }
              setJsonValue(text);
              setJsonError(undefined);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="JSON"
        placeholder={`{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"]
    }
  }
}`}
        value={jsonValue}
        error={jsonError}
        onChange={(value) => {
          setJsonValue(value);
          setJsonError(undefined);
        }}
      />
    </Form>
  );
}

function buildSuccessMessage(payload: ImportPayload): string {
  if (payload.mode === "bulk") {
    const count = Object.keys(payload.servers).length;
    return `Imported ${count} MCP ${count === 1 ? "server" : "servers"}`;
  }
  return "Imported MCP server";
}
