import { Action, ActionPanel, Detail, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { errorMessage } from "../lib/format";
import { executeTool, type ExecutionResult } from "../lib/tools";
import { emptyValConfig, type ValConfig } from "../lib/valconfig";

type Property = {
  name: string;
  type: string;
  description?: string;
  choices?: string[];
  required: boolean;
};

/** Built from the same schema the model receives, so the two callers stay in step. */
function propertiesOf(config: ValConfig): Property[] {
  const required = new Set(config.inputSchema?.required ?? []);
  return Object.entries(config.inputSchema?.properties ?? {}).map(([name, raw]) => {
    const value = raw as { type?: string; description?: string; enum?: unknown[] };
    return {
      name,
      type: value.type ?? "string",
      description: value.description,
      choices: Array.isArray(value.enum) ? value.enum.map(String) : undefined,
      required: required.has(name),
    };
  });
}

export function RunVal({ identifier, config }: { identifier: string; config: ValConfig | null | undefined }) {
  const effective = config ?? emptyValConfig();
  const properties = propertiesOf(effective);

  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [running, setRunning] = useState(properties.length === 0);

  async function run(args?: Record<string, unknown>) {
    setRunning(true);
    setFailure(null);
    try {
      setResult(await executeTool(identifier, effective, args));
    } catch (runError) {
      setFailure(errorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  // A val that takes nothing runs on open; the form would be an empty screen with a button.
  useEffect(() => {
    if (properties.length === 0) void run();
  }, []);

  async function submit(values: Record<string, unknown>) {
    const args: Record<string, unknown> = {};

    for (const property of properties) {
      const raw = values[property.name];

      if (property.type === "boolean") {
        args[property.name] = raw === true;
        continue;
      }

      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) {
        if (property.required) {
          await showToast({ style: Toast.Style.Failure, title: `${property.name} is required` });
          return;
        }
        continue;
      }

      if (property.type === "number" || property.type === "integer") {
        const parsed = Number(text);
        if (Number.isNaN(parsed)) {
          await showToast({ style: Toast.Style.Failure, title: `${property.name} must be a number` });
          return;
        }
        args[property.name] = parsed;
      } else if (property.type === "object" || property.type === "array") {
        try {
          args[property.name] = JSON.parse(text);
        } catch {
          await showToast({ style: Toast.Style.Failure, title: `${property.name} must be valid JSON` });
          return;
        }
      } else {
        args[property.name] = text;
      }
    }

    await run(args);
  }

  if (result || failure || running) {
    const markdown = failure
      ? `## Failed\n\n\`\`\`\n${failure}\n\`\`\``
      : result
        ? [
            `## ${result.ok ? "Ran" : `Failed${result.status ? ` (${result.status})` : ""}`} via ${result.via}`,
            "```\n" + (result.output || "(no output)").slice(0, 20000) + "\n```",
            ...(result.logs?.length ? ["### Logs", ...result.logs.map((line) => `- ${line}`)] : []),
          ].join("\n\n")
        : "Running";

    return (
      <Detail
        isLoading={running}
        navigationTitle={identifier}
        markdown={markdown}
        actions={
          <ActionPanel>
            {properties.length > 0 ? (
              <Action
                title="Edit Inputs"
                icon={Icon.Pencil}
                onAction={() => {
                  setResult(null);
                  setFailure(null);
                }}
              />
            ) : (
              <Action title="Run Again" icon={Icon.ArrowClockwise} onAction={() => void run()} />
            )}
            {result ? <Action.CopyToClipboard title="Copy Output" content={result.output} /> : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle={identifier}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Val" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {properties.map((property) => {
        const title = property.required ? `${property.name}*` : property.name;

        if (property.choices) {
          return (
            <Form.Dropdown key={property.name} id={property.name} title={title} info={property.description}>
              {(property.required ? property.choices : ["", ...property.choices]).map((choice) => (
                <Form.Dropdown.Item key={choice} value={choice} title={choice || "—"} />
              ))}
            </Form.Dropdown>
          );
        }

        if (property.type === "boolean") {
          return (
            <Form.Checkbox
              key={property.name}
              id={property.name}
              label={title}
              defaultValue={false}
              info={property.description}
            />
          );
        }

        if (property.type === "object" || property.type === "array") {
          return (
            <Form.TextArea
              key={property.name}
              id={property.name}
              title={title}
              placeholder={property.type === "array" ? "[ … ]" : "{ … }"}
              info={property.description}
            />
          );
        }

        return <Form.TextField key={property.name} id={property.name} title={title} info={property.description} />;
      })}
    </Form>
  );
}
