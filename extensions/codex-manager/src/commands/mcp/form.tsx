import { Action, ActionPanel, Form, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import type { McpServer, McpServerDoc } from "@/types";
import { buildDuplicateName, deleteMcpServer, setMcpServer } from "@/lib/mcp";
import { expandTilde, pathExists } from "@/lib/paths";
import { readTomlConfig, writeTomlConfig } from "@/lib/toml";
import { validateMcpServer } from "@/lib/validate";

type McpFormProps = {
  mode: "create" | "edit" | "duplicate";
  initial?: McpServer;
  existingNames: string[];
  onSaved?: () => void | Promise<void>;
};

function serializeArgs(args: string[] | undefined, format: "lines" | "json"): string {
  if (!args || args.length === 0) {
    return "";
  }
  if (format === "json") {
    return JSON.stringify(args, null, 2);
  }
  return args.join("\n");
}

function parseArgs(value: string, format: "lines" | "json"): string[] {
  if (!value.trim()) {
    return [];
  }
  if (format === "json") {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new Error("Args JSON must be an array of strings.");
    }
    return parsed;
  }
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function serializeEnv(env: Record<string, string> | undefined): string {
  if (!env) {
    return "";
  }
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function parseEnv(value: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!value.trim()) {
    return env;
  }

  const lines = value.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) {
      throw new Error(`Invalid env line: ${trimmed}`);
    }
    const key = trimmed.slice(0, index).trim();
    const val = trimmed.slice(index + 1).trim();
    if (!key) {
      throw new Error(`Invalid env key in line: ${trimmed}`);
    }
    env[key] = val;
  }

  return env;
}

export default function McpForm({ mode, initial, existingNames, onSaved }: McpFormProps) {
  const preferences = getPreferenceValues<Preferences>();
  const configPath = expandTilde(preferences.configPath);
  const { pop } = useNavigation();

  const defaultName = useMemo(() => {
    if (mode === "duplicate" && initial) {
      return buildDuplicateName(existingNames, initial.name);
    }
    return initial?.name ?? "";
  }, [existingNames, initial, mode]);

  const initialValues = {
    name: defaultName,
    command: initial?.command ?? "",
    args: serializeArgs(initial?.args, preferences.argsFormat),
    env: serializeEnv(initial?.env),
    cwd: initial?.cwd ?? "",
    enabled: initial?.enabled ?? true,
  };

  async function handleSubmit(values: typeof initialValues) {
    const trimmedName = values.name.trim();
    const existingNamesLower = new Set(existingNames.map((name) => name.toLowerCase()));
    const originalName = initial?.name;

    if (!trimmedName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    if (mode !== "edit" || trimmedName !== originalName) {
      if (existingNamesLower.has(trimmedName.toLowerCase())) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Name already exists",
        });
        return;
      }
    }

    let parsedArgs: string[] = [];
    let parsedEnv: Record<string, string> = {};

    try {
      parsedArgs = parseArgs(values.args, preferences.argsFormat);
      parsedEnv = parseEnv(values.env);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }

    const nextServer: McpServerDoc = {
      command: values.command.trim() || undefined,
      args: parsedArgs.length > 0 ? parsedArgs : undefined,
      env: Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
      cwd: values.cwd.trim() || undefined,
      enabled: values.enabled,
    };

    const errors = validateMcpServer(trimmedName, nextServer);
    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation failed",
        message: errors.join(" "),
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

      if (originalName && originalName !== trimmedName) {
        deleteMcpServer(doc, originalName);
      }

      setMcpServer(doc, trimmedName, nextServer);
      await writeTomlConfig(configPath, doc, preferences.createBackup);

      await showToast({
        style: Toast.Style.Success,
        title: "MCP server saved",
      });
      if (onSaved) {
        await onSaved();
      }
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle={mode === "edit" ? "Edit MCP Server" : "Add MCP Server"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="playwright" defaultValue={initialValues.name} />
      <Form.TextField id="command" title="Command" placeholder="npx" defaultValue={initialValues.command} />
      <Form.TextArea
        id="args"
        title="Args"
        placeholder={preferences.argsFormat === "json" ? '["arg1", "arg2"]' : "one arg per line"}
        defaultValue={initialValues.args}
      />
      <Form.TextArea id="env" title="Env" placeholder="KEY=value" defaultValue={initialValues.env} />
      <Form.TextField id="cwd" title="Cwd" placeholder="/path/to/project" defaultValue={initialValues.cwd} />
      <Form.Checkbox id="enabled" label="Enabled" defaultValue={initialValues.enabled} />
    </Form>
  );
}
