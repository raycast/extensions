import React from "react";
import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Form,
  Detail,
  open,
} from "@raycast/api";
import { searchTemplates, TemplateCard, runTemplate, pollTask } from "./api";

function renderStructuredMarkdown(
  value: unknown,
  title: string | null = null,
  level = 2,
): string {
  let md = "";
  if (title !== null) {
    md += `${"#".repeat(level)} ${title}\n\n`;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      md += renderStructuredMarkdown(
        item,
        Array.isArray(item) || typeof item === "object"
          ? `${title || "Item"} ${idx + 1}`
          : null,
        level + 1,
      );
    });
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => {
      md += renderStructuredMarkdown(v, k, level + 1);
    });
  } else {
    md += `${String(value)}\n\n`;
  }
  return md;
}

function flattenStructuredResult(
  value: unknown,
  title: string | null = null,
  level = 2,
  lines: string[] = [],
): string[] {
  if (title !== null) {
    lines.push("#".repeat(level) + " " + title);
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      flattenStructuredResult(
        item,
        Array.isArray(item) || typeof item === "object"
          ? `${title || "Item"} ${idx + 1}`
          : null,
        level + 1,
        lines,
      );
    });
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => {
      flattenStructuredResult(v, k, level + 1, lines);
    });
  } else {
    lines.push(String(value));
  }
  if (title !== null) lines.push("");
  return lines;
}

function ResultDetail({ result }: { result: unknown }) {
  // Prefer outputs if present, else body, else raw result
  let displayValue = result;
  if (result && typeof result === "object") {
    if ((result as unknown as { outputs?: unknown }).outputs)
      displayValue = (result as unknown as { outputs?: unknown }).outputs;
    else if ((result as unknown as { body?: unknown }).body)
      displayValue = (result as unknown as { body?: unknown }).body;
  }
  const plainText = flattenStructuredResult(displayValue, null, 2).join("\n");
  const markdown = renderStructuredMarkdown(displayValue, null, 2);
  return (
    <Detail
      navigationTitle="Generated Result"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={plainText} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchTemplates() {
  const [results, setResults] = useState<TemplateCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  async function handleSearch(query: string) {
    setSearchText(query);
    if (!query) {
      setResults([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const found = await searchTemplates(query);
      setResults(found);
    } catch (e: unknown) {
      setError(String(e));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search templates by name or description"
      onSearchTextChange={handleSearch}
      throttle
      actions={
        !searchText ? (
          <ActionPanel>
            <Action
              title="Create New Template on Buenote.app"
              onAction={() => open("https://buenote.app/templates/new")}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {error && <List.EmptyView title="Error" description={error} />}
      {results.map((tpl) => (
        <List.Item
          key={tpl.id}
          title={tpl.name}
          subtitle={tpl.description}
          actions={
            <ActionPanel>
              <Action
                title="Run"
                onAction={() =>
                  push(<RunForm templateId={tpl.id} templateName={tpl.name} />)
                }
              />
              <Action
                title="Create New Template on Buenote.app"
                onAction={() => open("https://buenote.app/templates/new")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RunForm({
  templateId,
  templateName,
}: {
  templateId: number;
  templateName: string;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [inputFields, setInputFields] = useState<
    { name: string; description: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    async function fetchTemplateDetails() {
      setFetching(true);
      setError(null);
      try {
        const token = await (await import("./auth")).getValidAccessToken();
        const res = await fetch(
          `https://buenote.app/api/templates/${templateId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok)
          throw new Error(`Failed to fetch template details (${res.status})`);
        const data = await res.json();
        console.log("[RunForm] Template details fetched:", data); // DEBUG
        const fields = Object.entries(data.inputs || {}).map(
          ([name, meta]: [string, unknown]) => ({
            name,
            description:
              typeof meta === "object" && meta && "description" in meta
                ? (meta as { description?: string }).description || ""
                : "",
          }),
        );
        console.log("[RunForm] Computed inputFields:", fields); // DEBUG
        setInputFields(fields);
      } catch (e: unknown) {
        setError(String(e));
      } finally {
        setFetching(false);
      }
    }
    fetchTemplateDetails();
  }, [templateId]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { task_id } = await runTemplate(templateId, inputs);
      // poll
      let attempts = 0;
      let result: unknown = null;
      while (attempts < 120) {
        console.log("[RunForm] Polling attempt", attempts + 1); // DEBUG
        const resp = await pollTask(task_id);
        console.log("[RunForm] Poll response:", resp); // DEBUG
        if (resp && resp.status === "success") {
          result = resp.result;
          console.log("[RunForm] Task completed successfully, result:", result); // DEBUG
          break;
        }
        if (resp && resp.status === "failure") {
          throw new Error(resp.error || "Task failed");
        }
        if (!resp) {
          console.log("[RunForm] No response from poll, continuing..."); // DEBUG
        } else {
          console.log("[RunForm] Task still running, status:", resp.status); // DEBUG
        }
        await new Promise((r) => setTimeout(r, 1000));
        attempts += 1;
      }
      if (!result) throw new Error("Timed out");
      await showToast({ style: Toast.Style.Success, title: "Generated" });
      push(<ResultDetail result={result} />);
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(e),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (fetching) return <Form isLoading navigationTitle={templateName} />;
  if (error)
    return (
      <Form isLoading={false} navigationTitle={templateName}>
        <Form.Description title="Error" text={error} />
      </Form>
    );

  return (
    <Form
      navigationTitle={templateName}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {inputFields.map((field) => (
        <Form.TextArea
          key={field.name}
          id={field.name}
          title={field.name}
          placeholder={field.description}
          onChange={(val) =>
            setInputs((prev) => ({ ...prev, [field.name]: val }))
          }
        />
      ))}
    </Form>
  );
}

export { RunForm };
