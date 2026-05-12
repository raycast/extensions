import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Clipboard, open } from "@raycast/api";
import { useState, useEffect } from "react";
import * as strudelTranspiler from "@strudel/transpiler";
import { code2hash } from "@strudel/core";
import { renderAndPlay, renderAndExport, pauseLive, resumeLive, stopLive, getLiveState } from "./lib/strudel";
import { savePattern } from "./lib/storage";

function SavePatternForm({ code, onSaved }: { code: string; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: { name: string }) => {
              const trimmed = values.name.trim();
              if (!trimmed) {
                await showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              await savePattern(trimmed, code);
              await showToast({ style: Toast.Style.Success, title: "Pattern saved", message: trimmed });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} placeholder="my-beat" />
      <Form.Description title="Code" text={code} />
    </Form>
  );
}

export default function Command() {
  const [code, setCode] = useState<string>('s("bd sn")');
  const [result, setResult] = useState<string>("");
  const [playState, setPlayState] = useState<"playing" | "paused" | "stopped">("stopped");

  useEffect(() => {
    return () => {
      stopLive().catch(() => {});
    };
  }, []);

  const handleEvaluate = async (values: { code: string }) => {
    try {
      const res = await strudelTranspiler.evaluate(values.code);
      const pattern = (res as { pattern?: { firstCycleValues?: unknown } }).pattern ?? res;
      const preview = (pattern as { firstCycleValues?: unknown }).firstCycleValues ?? pattern;
      setResult(JSON.stringify(preview, null, 2));
      await showToast({ style: Toast.Style.Success, title: "Evaluated successfully" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to evaluate", message: String(error) });
      setResult(String(error));
    }
  };

  const handlePlay = async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Rendering..." });
      await renderAndPlay(code, {}, "default", false);
      setPlayState(getLiveState());
      await showToast({ style: Toast.Style.Success, title: "Playing" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to play", message: String(error) });
    }
  };

  const handlePause = async () => {
    await pauseLive();
    setPlayState(getLiveState());
    await showToast({ style: Toast.Style.Success, title: "Paused" });
  };

  const handleResume = async () => {
    await resumeLive();
    setPlayState(getLiveState());
    await showToast({ style: Toast.Style.Success, title: "Resumed" });
  };

  const handleStop = async () => {
    await stopLive();
    setPlayState("stopped");
    await showToast({ style: Toast.Style.Success, title: "Stopped" });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Evaluate" onSubmit={handleEvaluate} />
          {playState === "stopped" && <Action title="Play" onAction={handlePlay} />}
          {playState === "playing" && <Action title="Pause" onAction={handlePause} />}
          {playState === "paused" && <Action title="Resume" onAction={handleResume} />}
          {playState !== "stopped" && <Action title="Stop" onAction={handleStop} />}
          <Action.Push
            title="Save Pattern"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<SavePatternForm code={code} onSaved={() => {}} />}
          />
          <Action
            title="Paste from Clipboard"
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text?.trim()) {
                setCode(text.trim());
              } else {
                await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
              }
            }}
          />
          <Action
            title="Export WAV"
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={async () => {
              try {
                await showToast({ style: Toast.Style.Animated, title: "Rendering..." });
                const filename = `strudel-${Date.now()}`;
                const outPath = await renderAndExport(code, {}, filename);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Exported",
                  message: `${filename}.wav`,
                  primaryAction: { title: "Show in Finder", onAction: () => open(outPath) },
                });
              } catch (e) {
                await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(e) });
              }
            }}
          />
          <Action.OpenInBrowser
            title="Open in REPL"
            url={`https://strudel.cc/#${code2hash(code)}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          {result && <Action.CopyToClipboard title="Copy Result" content={result} />}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="code"
        title="Strudel Code"
        placeholder="Enter Strudel code..."
        value={code}
        onChange={setCode}
      />
      {result && <Form.Description title="Result" text={result} />}
    </Form>
  );
}
