import { execFile } from "node:child_process";

import { Action, ActionPanel, closeMainWindow, Detail, openExtensionPreferences, PopToRootType } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { captureSelectedArea } from "./capture";
import { SystemMessageForm } from "./edit-system-message";
import { normalizeOcrError } from "./errors";
import { buildImageDataUrl, requestOpenRouterOcr } from "./openrouter";
import { getSetupGate } from "./setup-config";
import { getDefaultCopyBehavior } from "./preferences";
import { ModelPicker, SetupView } from "./setup";
import { getConfiguredSystemMessage } from "./system-message";
import type { OcrError, OcrResult, OcrSetupConfig } from "./types";

type ViewState =
  | {
      status: "loading";
      phase: "capturing" | "processing";
      message: string;
    }
  | {
      status: "result";
      result: OcrResult;
    }
  | {
      status: "error";
      error: OcrError;
    };

let activeOcrRun: Promise<OcrResult | OcrError> | null = null;
let setLoadingState: ((phase: "capturing" | "processing", message: string) => void) | null = null;

function bringRaycastToFront(): Promise<void> {
  return openFirstAvailableBundle(["com.raycast.macos", "com.raycast-x.macos"]);
}

async function openFirstAvailableBundle(bundleIds: string[]): Promise<void> {
  const errors: string[] = [];

  for (const bundleId of bundleIds) {
    try {
      await openBundle(bundleId);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${bundleId}: ${message}`);
    }
  }

  throw new Error(`Unable to open Raycast. Tried ${errors.join("; ")}`);
}

function openBundle(bundleId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("open", ["-b", bundleId], (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export default function Command() {
  const [setupConfig, setSetupConfig] = useState<OcrSetupConfig>();
  const [setupStatus, setSetupStatus] = useState<"checking" | "required" | "ready">("checking");
  const [state, setState] = useState<ViewState>({
    status: "loading",
    phase: "capturing",
    message: "Checking setup...",
  });
  const [isEditingSystemMessage, setIsEditingSystemMessage] = useState(false);
  const [isChangingModel, setIsChangingModel] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setLoadingState = (phase, message) => {
      if (!isMountedRef.current) {
        return;
      }

      setState({
        status: "loading",
        phase,
        message,
      });
    };

    return () => {
      isMountedRef.current = false;
      setLoadingState = null;
    };
  }, []);

  const applyOutcome = useCallback((outcome: OcrResult | OcrError) => {
    if ("text" in outcome) {
      setState({
        status: "result",
        result: outcome,
      });
      return;
    }

    setState({
      status: "error",
      error: outcome,
    });
  }, []);

  const runOcr = useCallback(
    async (config = setupConfig) => {
      if (!config) {
        setSetupStatus("required");
        return;
      }

      setState({
        status: "loading",
        phase: "capturing",
        message: "Getting ready to capture...",
      });

      if (!activeOcrRun) {
        let currentRun: Promise<OcrResult | OcrError> | null = null;
        currentRun = (async (): Promise<OcrResult | OcrError> => {
          try {
            await closeMainWindow({ popToRootType: PopToRootType.Suspended });

            const imageBytes = await captureSelectedArea();

            setLoadingState?.("processing", "Reading the text from your screenshot...");
            await bringRaycastToFront();

            const imageDataUrl = buildImageDataUrl(imageBytes);
            const systemMessage = await getConfiguredSystemMessage();
            const text = await requestOpenRouterOcr({
              setupConfig: config,
              systemMessage,
              imageDataUrl,
            });

            return {
              text,
              model: config.model,
              createdAt: new Date(),
            };
          } catch (error) {
            return normalizeOcrError(error);
          } finally {
            if (activeOcrRun === currentRun) {
              activeOcrRun = null;
            }
          }
        })();
        activeOcrRun = currentRun;
      }

      const outcome = await activeOcrRun;

      if (isMountedRef.current) {
        applyOutcome(outcome);
      }
    },
    [applyOutcome, setupConfig],
  );

  useEffect(() => {
    async function loadSetup(): Promise<void> {
      const gate = await getSetupGate();

      if (!isMountedRef.current) {
        return;
      }

      if (gate.kind !== "ready") {
        setSetupStatus("required");
        return;
      }

      setSetupConfig(gate.config);
      setSetupStatus("ready");
    }

    void loadSetup();
  }, []);

  useEffect(() => {
    if (setupStatus === "ready" && setupConfig) {
      void runOcr(setupConfig);
    }
  }, [runOcr, setupConfig, setupStatus]);

  const handleSetupSaved = useCallback(async () => {
    const gate = await getSetupGate();

    if (gate.kind !== "ready") {
      setSetupStatus("required");
      return;
    }

    setSetupConfig(gate.config);
    setSetupStatus("ready");
    setIsChangingModel(false);
  }, []);

  const markdown = useMemo(() => buildMarkdown(state), [state]);

  if (setupStatus === "required") {
    return <SetupView onSaved={handleSetupSaved} />;
  }

  if (isEditingSystemMessage) {
    return (
      <SystemMessageForm
        onCancel={() => setIsEditingSystemMessage(false)}
        onSaved={() => setIsEditingSystemMessage(false)}
      />
    );
  }

  if (isChangingModel && setupConfig) {
    return (
      <ModelPicker
        existingConfig={setupConfig}
        currentModelId={setupConfig.model}
        onSaved={handleSetupSaved}
        onBack={() => setIsChangingModel(false)}
      />
    );
  }

  if (state.status === "loading") {
    return <Detail isLoading={state.phase === "processing"} markdown={markdown} />;
  }

  if (state.status === "result") {
    const plainText = stripFormatting(state.result.text);
    const isDefaultFormatted = getDefaultCopyBehavior() === "formatted";
    const defaultCopyText = isDefaultFormatted ? state.result.text : plainText;
    const secondaryCopyTitle = isDefaultFormatted ? "Copy as Plain Text" : "Copy with Formatting (Markdown)";
    const secondaryCopyText = isDefaultFormatted ? plainText : state.result.text;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy" content={defaultCopyText} />
            <Action.CopyToClipboard
              title={secondaryCopyTitle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              content={secondaryCopyText}
            />
            <Action title="Try Again" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={runOcr} />
            <Action
              title="Change Model"
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={() => setIsChangingModel(true)}
            />
            <Action
              title="Edit OCR Instructions"
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => setIsEditingSystemMessage(true)}
            />
          </ActionPanel>
        }
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={state.result.model} />
            <Detail.Metadata.Label title="Created" text={state.result.createdAt.toLocaleString()} />
          </Detail.Metadata>
        }
      />
    );
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {state.error.retryable ? (
            <Action title="Try Again" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={runOcr} />
          ) : null}
          {setupConfig ? (
            <Action
              title="Change Model"
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              onAction={() => setIsChangingModel(true)}
            />
          ) : null}
          {shouldShowSetupAction(state.error) ? (
            <Action title="Finish Setup" onAction={() => setSetupStatus("required")} />
          ) : null}
          {state.error.kind === "configuration" ? (
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          ) : null}
          <Action
            title="Edit OCR Instructions"
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => setIsEditingSystemMessage(true)}
          />
        </ActionPanel>
      }
    />
  );
}

function stripFormatting(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      let text = line;
      text = text.replace(/^\s*#{1,6}\s+/, "");
      text = text.replace(/^(\s*)(?:[-*+]|\d+[.)])\s+/, "$1");
      text = text.replace(/^\s*>\s?/, "");
      text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
      text = text.replace(/(\*|_)(.*?)\1/g, "$2");
      text = text.replace(/~~(.*?)~~/g, "$1");
      text = text.replace(/`([^`]*)`/g, "$1");
      return text;
    })
    .join("\n");
}

function formatCenteredStatusMarkdown(title: string, message?: string): string {
  const messageBlock = message ? `\n\n${message}` : "";

  return `<div align="center">\n\n# ${title}${messageBlock}\n\n</div>`;
}

function formatOcrTextForDisplay(text: string): string {
  return text.replace(/(?<!\n)\n(?!\n)/g, "  \n");
}

function buildMarkdown(state: ViewState): string {
  switch (state.status) {
    case "loading":
      return formatCenteredStatusMarkdown("Extract Screenshot Text", state.message);
    case "result":
      return formatOcrTextForDisplay(state.result.text);
    case "error":
      return formatCenteredStatusMarkdown(getErrorTitle(state.error), state.error.message);
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

function getErrorTitle(error: OcrError): string {
  switch (error.kind) {
    case "capture_canceled":
      return "Capture Canceled";
    case "capture_failed":
      return "Capture Failed";
    case "configuration":
      return "Setup Needed";
    case "network":
      return "Connection Problem";
    case "provider":
      return "OpenRouter Problem";
    case "empty":
      return "No Text Found";
    case "unknown":
      return "Something Went Wrong";
    default: {
      const exhaustiveCheck: never = error.kind;
      return exhaustiveCheck;
    }
  }
}

function shouldShowSetupAction(error: OcrError): boolean {
  switch (error.kind) {
    case "configuration":
    case "provider":
      return true;
    case "capture_canceled":
    case "capture_failed":
    case "empty":
    case "network":
    case "unknown":
      return false;
    default: {
      const exhaustiveCheck: never = error.kind;
      return exhaustiveCheck;
    }
  }
}
