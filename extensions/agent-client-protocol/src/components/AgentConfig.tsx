/**
 * Agent Configuration Form
 *
 * Provides UI for creating and editing agent configurations, including
 * support for built-in agents that can now be customized.
 */

import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { ConfigService } from "@/services/configService";
import { ErrorHandler } from "@/utils/errors";
import { validateAgentConfig, generateAgentId } from "@/utils/builtInAgents";
import type { AgentConfig } from "@/types/extension";

type AgentType = AgentConfig["type"];

interface AgentConfigFormProps {
  mode: "create" | "edit";
  existingConfig?: AgentConfig;
  onSave?: () => void | Promise<void>;
}

interface AgentFormValues {
  name: string;
  description?: string;
  type: AgentType;
  command?: string;
  args?: string;
  endpoint?: string;
  environmentVariables?: string;
  appendToPath?: string;
}

const configService = new ConfigService();

export function AgentConfigForm({ mode, existingConfig, onSave }: AgentConfigFormProps) {
  const { pop } = useNavigation();
  const [agentType, setAgentType] = useState<AgentType>(existingConfig?.type ?? "subprocess");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = useMemo<AgentFormValues>(() => {
    const commandTokens = existingConfig?.command ? splitCommandLine(existingConfig.command) : [];
    const argsFromCommand = commandTokens.length > 1 ? commandTokens.slice(1) : [];
    const combinedArgs = [...argsFromCommand, ...(existingConfig?.args ?? [])]
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      name: existingConfig?.name ?? "",
      description: existingConfig?.description ?? "",
      type: existingConfig?.type ?? "subprocess",
      command: commandTokens.length > 0 ? commandTokens[0] : (existingConfig?.command ?? ""),
      args: combinedArgs.join(" "),
      endpoint: existingConfig?.endpoint ?? "",
      environmentVariables: existingConfig?.environmentVariables
        ? Object.entries(existingConfig.environmentVariables)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n")
        : "",
      appendToPath: existingConfig?.appendToPath?.join("\n") ?? "",
    };
  }, [existingConfig]);

  async function handleSubmit(values: AgentFormValues) {
    try {
      setIsSubmitting(true);

      const args = parseArguments(values.args);
      const commandTokens = values.command ? splitCommandLine(values.command) : [];

      let commandValue = existingConfig?.command ?? "";
      if (commandTokens.length > 0) {
        commandValue = commandTokens[0];
      } else if (values.command?.trim()) {
        commandValue = values.command.trim();
      }

      const combinedArgs = [...(commandTokens.length > 1 ? commandTokens.slice(1) : []), ...(args ?? [])];
      let environmentVariables: Record<string, string> | undefined;

      try {
        environmentVariables = parseEnvironmentVariables(values.environmentVariables);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Environment Variables",
          message: error instanceof Error ? error.message : "Please use KEY=value format per line.",
        });
        return;
      }

      const appendToPath = parsePathEntries(values.appendToPath);

      const config: AgentConfig = existingConfig
        ? {
            ...existingConfig,
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            type: values.type,
            command: values.type === "subprocess" ? commandValue : undefined,
            args: values.type === "subprocess" ? (combinedArgs.length > 0 ? combinedArgs : undefined) : undefined,
            endpoint: values.type === "remote" ? values.endpoint?.trim() : undefined,
            environmentVariables: environmentVariables ?? undefined,
            appendToPath: values.type === "subprocess" ? appendToPath : undefined,
          }
        : {
            id: generateAgentId(values.name),
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            type: values.type,
            command: values.type === "subprocess" ? commandValue : undefined,
            args: values.type === "subprocess" ? (combinedArgs.length > 0 ? combinedArgs : undefined) : undefined,
            endpoint: values.type === "remote" ? values.endpoint?.trim() : undefined,
            environmentVariables: environmentVariables ?? undefined,
            appendToPath: values.type === "subprocess" ? appendToPath : undefined,
            isBuiltIn: false,
            createdAt: new Date(),
            lastUsed: undefined,
          };

      const validation = validateAgentConfig(config);
      if (!validation.isValid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Configuration",
          message: validation.errors.join(", "),
        });
        return;
      }

      await configService.saveAgentConfig(config);
      await showToast({
        style: Toast.Style.Success,
        title: mode === "create" ? "Agent Added" : "Agent Updated",
        message: `${config.name} configuration saved`,
      });

      await onSave?.();
      pop();
    } catch (error) {
      await ErrorHandler.handleError(
        error,
        mode === "create" ? "Creating agent configuration" : "Updating agent configuration",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={mode === "create" ? "Add Agent Configuration" : "Edit Agent Configuration"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Create Agent" : "Save Changes"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={() => pop()} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure how Raycast connects to your Agent Client Protocol compatible agent." />

      <Form.TextField id="name" title="Agent Name" placeholder="Gemini CLI" defaultValue={defaultValues.name} />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description for this agent"
        defaultValue={defaultValues.description}
      />

      <Form.Dropdown
        id="type"
        title="Agent Type"
        defaultValue={defaultValues.type}
        onChange={(value) => setAgentType(value as AgentType)}
      >
        <Form.Dropdown.Item value="subprocess" title="Subprocess (local command)" />
        <Form.Dropdown.Item value="remote" title="Remote (WebSocket endpoint)" />
      </Form.Dropdown>

      {agentType === "subprocess" && (
        <>
          <Form.TextField
            id="command"
            title="Command"
            placeholder="/usr/local/bin/gemini"
            defaultValue={defaultValues.command}
          />

          <Form.TextField id="args" title="Arguments" placeholder="--acp --verbose" defaultValue={defaultValues.args} />
        </>
      )}

      {agentType === "remote" && (
        <Form.TextField
          id="endpoint"
          title="Endpoint URL"
          placeholder="ws://localhost:8080/acp"
          defaultValue={defaultValues.endpoint}
        />
      )}

      <Form.TextArea
        id="environmentVariables"
        title="Environment Variables"
        placeholder="KEY=value (one per line)"
        defaultValue={defaultValues.environmentVariables}
      />

      {agentType === "subprocess" && (
        <Form.TextArea
          id="appendToPath"
          title="Additional PATH Directories"
          placeholder="/Users/username/.bun/bin (one per line)"
          info="Add directories to PATH for finding the command binary. Use this if the command is installed in a non-standard location."
          defaultValue={defaultValues.appendToPath}
        />
      )}
    </Form>
  );
}

function parseArguments(input?: string): string[] | undefined {
  if (!input) {
    return undefined;
  }

  const tokens = input
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.length > 0 ? tokens : undefined;
}

function parseEnvironmentVariables(input?: string): Record<string, string> | undefined {
  if (!input || !input.trim()) {
    return undefined;
  }

  const env: Record<string, string> = {};

  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    if (!key || rest.length === 0) {
      throw new Error(`Invalid environment variable format: "${line}". Use KEY=value.`);
    }

    env[key.trim()] = rest.join("=").trim();
  }

  return Object.keys(env).length > 0 ? env : undefined;
}

function parsePathEntries(input?: string): string[] | undefined {
  if (!input || !input.trim()) {
    return undefined;
  }

  const paths = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return paths.length > 0 ? paths : undefined;
}

function splitCommandLine(input: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|[^\s]+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const value = match[1] ?? match[2] ?? match[0];
    tokens.push(value);
  }

  return tokens;
}

export function AddAgentForm(props: Omit<AgentConfigFormProps, "mode">) {
  return <AgentConfigForm mode="create" {...props} />;
}

export function EditAgentForm(props: Omit<AgentConfigFormProps, "mode">) {
  return <AgentConfigForm mode="edit" {...props} />;
}
