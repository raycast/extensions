import { useState, useRef } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { streamForge } from "./llm";
import { evaluateContent } from "./contentGate";
import { META_SYSTEM_PROMPT } from "./metaPrompt";

interface Preferences {
  provider: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

type Mode = "auto" | "agent" | "project";

export default function ForgeCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [output, setOutput] = useState("");
  const [isForging, setIsForging] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleForge() {
    if (!brief.trim()) return;

    const gate = evaluateContent(brief);
    if (gate.blocked) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Blocked",
        message: "I cannot assist with that request.",
      });
      return;
    }

    if (!prefs.apiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No API Key",
        message: "Set your API key in extension preferences.",
      });
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setOutput("");
    setIsForging(true);
    setShowResult(true);

    try {
      let acc = "";
      await streamForge({
        config: {
          provider: prefs.provider as Parameters<
            typeof streamForge
          >[0]["config"]["provider"],
          apiKey: prefs.apiKey,
          model: prefs.model || "gpt-4o",
          baseUrl: prefs.baseUrl,
        },
        systemPrompt: META_SYSTEM_PROMPT,
        userPrompt: brief,
        signal: abortRef.current.signal,
        onToken: (chunk) => {
          acc += chunk;
          setOutput(acc);
        },
      });
    } catch (err: unknown) {
      if (!abortRef.current?.signal.aborted) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await showToast({
          style: Toast.Style.Failure,
          title: "Forge failed",
          message,
        });
      }
    } finally {
      setIsForging(false);
    }
  }

  if (showResult) {
    return (
      <Detail
        isLoading={isForging}
        markdown={output || "*Forging...*"}
        navigationTitle="Forge Result"
        actions={
          <ActionPanel>
            <Action
              title="Copy Result"
              onAction={() => Clipboard.copy(output)}
            />
            <Action
              title="New Forge"
              onAction={() => {
                setShowResult(false);
                setOutput("");
              }}
            />
            <Action title="Abort" onAction={() => abortRef.current?.abort()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Valerius Forge"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Forge 🔥" onSubmit={handleForge} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="brief"
        title="Brief"
        placeholder="Describe the AI agent, app, or system you want to forge..."
        value={brief}
        onChange={setBrief}
      />
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode}
        onChange={(v) => setMode(v as Mode)}
      >
        <Form.Dropdown.Item value="auto" title="Auto Detect" />
        <Form.Dropdown.Item value="agent" title="Agent Prompt" />
        <Form.Dropdown.Item value="project" title="Full Project" />
      </Form.Dropdown>
      <Form.Description
        title="Provider"
        text={`${prefs.provider} · ${prefs.model || "gpt-4o"}`}
      />
    </Form>
  );
}
