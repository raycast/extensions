import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getCliDebounceDelay } from "./utils/preferences";
import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedText,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type FormValues = {
  input: string;
  showGloss: boolean;
};

type GlossToken = {
  ipa?: string;
  shavian?: string;
  source?: string;
  type?: string;
  value?: string;
};

type GlossResult = {
  raw: string;
  tokens: GlossToken[];
};

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Shavian }>,
) {
  return <ShavianCommand initialInput={props.arguments.text} />;
}

function ShavianCommand({ initialInput = "" }: { initialInput?: string }) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();

      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return <ShavianForm initialInput={initialInput} />;
}

function ShavianForm({ initialInput }: { initialInput: string }) {
  const [values, setValues] = useState<FormValues>({
    input: initialInput,
    showGloss: false,
  });
  const [shavian, setShavian] = useState("");
  const [gloss, setGloss] = useState<GlossResult>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGlossProcessing, setIsGlossProcessing] = useState(false);
  const lastToastErrorRef = useRef("");
  const glossMarkdown = useMemo(
    () => (gloss ? getGlossMarkdown(values.input, shavian, gloss) : ""),
    [gloss, shavian, values.input],
  );

  useEffect(() => {
    async function hydrateInitialInput() {
      const input = await getInitialInput();

      if (!input) {
        return;
      }

      setValues((currentValues) => {
        if (currentValues.input) {
          return currentValues;
        }

        return {
          ...currentValues,
          input,
        };
      });
    }

    hydrateInitialInput();
  }, []);

  useEffect(() => {
    if (!values.input.trim()) {
      setShavian("");
      setGloss(undefined);
      lastToastErrorRef.current = "";
      setIsProcessing(false);
      setIsGlossProcessing(false);
      return;
    }

    setIsProcessing(true);
    setIsGlossProcessing(values.showGloss);

    const timeout = setTimeout(async () => {
      try {
        const [nextShavian, nextGloss] = await Promise.all([
          runShavian(values.input),
          values.showGloss ? runShavianGloss(values.input) : undefined,
        ]);

        setShavian(nextShavian);
        setGloss(nextGloss);
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toastErrorKey = `${values.input}:${values.showGloss}:${message}`;

        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not transliterate text",
            message,
          });
        }
      } finally {
        setIsProcessing(false);
        setIsGlossProcessing(false);
      }
    }, getCliDebounceDelay());

    return () => {
      clearTimeout(timeout);
    };
  }, [values.input, values.showGloss]);

  async function copyShavian() {
    if (!shavian) {
      return;
    }

    await Clipboard.copy(shavian);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Shavian",
    });
  }

  async function copyGloss() {
    if (!glossMarkdown) {
      return;
    }

    await Clipboard.copy(glossMarkdown);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Gloss",
    });
  }

  async function exportGloss() {
    if (!glossMarkdown) {
      return;
    }

    const path = join(tmpdir(), "delphitools-shavian-gloss.md");

    await writeFile(path, glossMarkdown, "utf8");
    await showToast({
      style: Toast.Style.Success,
      title: "Exported Gloss",
      message: path,
    });
  }

  return (
    <Form
      isLoading={isProcessing || isGlossProcessing}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy Shavian"
            onAction={copyShavian}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Input"
            content={values.input}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            icon={Icon.Text}
            title={values.showGloss ? "Hide Gloss" : "Show Gloss"}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={() =>
              setValues((currentValues) => ({
                ...currentValues,
                showGloss: !currentValues.showGloss,
              }))
            }
          />
          {gloss ? (
            <Action.Push
              icon={Icon.Eye}
              title="Preview Gloss"
              target={
                <GlossDetail
                  glossMarkdown={glossMarkdown}
                  input={values.input}
                  shavian={shavian}
                />
              }
            />
          ) : null}
          {gloss ? (
            <Action
              icon={Icon.Clipboard}
              title="Copy Gloss"
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
              onAction={copyGloss}
            />
          ) : null}
          {gloss ? (
            <Action
              icon={Icon.Download}
              title="Export Gloss"
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={exportGloss}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="English text"
        value={values.input}
        onChange={(input) =>
          setValues((currentValues) => ({
            ...currentValues,
            input,
          }))
        }
      />
      <Form.Checkbox
        id="showGloss"
        label="Show gloss"
        value={values.showGloss}
        onChange={(showGloss) =>
          setValues((currentValues) => ({
            ...currentValues,
            showGloss,
          }))
        }
      />
      <Form.Description
        title="Shavian"
        text={getResultText(shavian, isProcessing)}
      />
      {values.showGloss ? (
        <Form.Description
          title="Gloss"
          text={getGlossPreview(gloss, isGlossProcessing)}
        />
      ) : null}
    </Form>
  );
}

function GlossDetail({
  glossMarkdown,
  input,
  shavian,
}: {
  glossMarkdown: string;
  input: string;
  shavian: string;
}) {
  return (
    <Detail
      markdown={glossMarkdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Shavian"
            content={shavian}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copy Input"
            content={input}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action.CopyToClipboard
            title="Copy Gloss"
            content={glossMarkdown}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        </ActionPanel>
      }
    />
  );
}

async function getInitialInput(): Promise<string> {
  try {
    const selectedText = await getSelectedText();

    if (selectedText.trim()) {
      return selectedText;
    }
  } catch {
    // Selection is optional; clipboard is the fallback source.
  }

  return (await Clipboard.readText()) ?? "";
}

async function runShavian(input: string): Promise<string> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "shavian",
    "--quiet",
    input,
  ]);

  return stdout.trimEnd();
}

async function runShavianGloss(input: string): Promise<GlossResult> {
  const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
    "shavian",
    "--json",
    "--gloss",
    input,
  ]);

  return parseGlossOutput(stdout);
}

function parseGlossOutput(stdout: string): GlossResult {
  const parsed = JSON.parse(stdout) as unknown;

  if (!Array.isArray(parsed)) {
    return {
      raw: stdout.trimEnd(),
      tokens: [],
    };
  }

  return {
    raw: stdout.trimEnd(),
    tokens: parsed.map((token) =>
      token && typeof token === "object" ? normalizeGlossToken(token) : {},
    ),
  };
}

function normalizeGlossToken(token: object): GlossToken {
  const record = token as Record<string, unknown>;

  return {
    ipa: typeof record.ipa === "string" ? record.ipa : undefined,
    shavian: typeof record.shavian === "string" ? record.shavian : undefined,
    source: typeof record.source === "string" ? record.source : undefined,
    type: typeof record.type === "string" ? record.type : undefined,
    value: typeof record.value === "string" ? record.value : undefined,
  };
}

function getResultText(output: string, isProcessing: boolean): string {
  if (isProcessing) {
    return output ? `${output}...` : "...";
  }

  return output || " ";
}

function getGlossPreview(
  gloss: GlossResult | undefined,
  isProcessing: boolean,
): string {
  if (isProcessing) {
    return gloss ? "Updating gloss..." : "...";
  }

  if (!gloss) {
    return " ";
  }

  const rows = gloss.tokens.filter((token) => token.type === "word");

  if (!rows.length) {
    return gloss.raw || " ";
  }

  const preview = rows
    .slice(0, 4)
    .map((token) => formatGlossTokenPreview(token))
    .join("  ·  ");

  if (rows.length <= 4) {
    return preview;
  }

  return `${preview}  ·  ${rows.length - 4} more in Preview Gloss`;
}

function formatGlossTokenPreview(token: GlossToken): string {
  return [
    token.value ?? "",
    token.shavian ?? "",
    token.ipa ? `/${token.ipa}/` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getGlossMarkdown(
  input: string,
  shavian: string,
  gloss: GlossResult,
): string {
  const wordTokens = gloss.tokens.filter((token) => token.type === "word");

  if (!wordTokens.length) {
    return [
      "# Shavian Gloss",
      "",
      "## Input",
      "",
      input,
      "",
      "## Shavian",
      "",
      shavian,
      "",
      "## Raw Gloss",
      "",
      "```json",
      gloss.raw,
      "```",
    ].join("\n");
  }

  return [
    "# Shavian Gloss",
    "",
    "## Input",
    "",
    input,
    "",
    "## Shavian",
    "",
    shavian,
    "",
    "## Tokens",
    "",
    "| Latin | Shavian | IPA | Source |",
    "| --- | --- | --- | --- |",
    ...wordTokens.map(
      (token) =>
        `| ${escapeTableCell(token.value)} | ${escapeTableCell(token.shavian)} | ${escapeTableCell(token.ipa)} | ${escapeTableCell(token.source)} |`,
    ),
  ].join("\n");
}

function escapeTableCell(value: string | undefined): string {
  return (value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}
