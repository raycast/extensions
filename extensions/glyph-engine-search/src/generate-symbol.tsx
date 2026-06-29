import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  environment,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, extname, join, posix } from "node:path";
import { useState } from "react";

const bridgeSchemaVersion = 1;
const appURLScheme = "glyphengine";
const pollIntervalMs = 1000;
const generationTimeoutMs = 5 * 60 * 1000;
const previewWidth = 396;
const previewHeight = 144;
const previewPadding = 10;
const previewSymbolSize = previewHeight - previewPadding * 2;

type RequestMode = "text" | "image";

type FormValues = {
  prompt: string;
  referenceImage?: string[];
};

type BridgeRequest = {
  schemaVersion: number;
  id: string;
  mode: RequestMode;
  prompt: string;
  imageRelativePath?: string;
  createdAt: string;
};

type BridgeResponse = {
  schemaVersion: number;
  id: string;
  status: "succeeded" | "failed";
  completedAt: string;
  displayName?: string;
  svg?: string;
  standaloneSVG?: string;
  sfSymbolsTemplateSVG?: string;
  remainingCredits?: number;
  errorCode?: string;
  message?: string;
};

type SuccessState = {
  response: BridgeResponse;
  previewPath: string;
};

type ParsedSVG = {
  viewBox: [number, number, number, number];
  body: string;
};

function bridgeRootPath(): string {
  return join(
    homedir(),
    "Library",
    "Containers",
    "com.nickarner.glyphengine",
    "Data",
    "Library",
    "Application Support",
    "GlyphEngine",
    "RaycastBridge",
  );
}

function requestPath(id: string): string {
  return join(bridgeRootPath(), "requests", `${id}.json`);
}

function responsePath(id: string): string {
  return join(bridgeRootPath(), "responses", `${id}.json`);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function svgForResponse(response: BridgeResponse): string {
  return response.standaloneSVG ?? response.svg ?? "";
}

function svgForPreview(response: BridgeResponse): string {
  const symbol = parsedSymbolSVG(response);
  const [minX, minY, width, height] = symbol.viewBox;
  const scale = Math.min(previewSymbolSize / width, previewSymbolSize / height);
  const offsetX = (previewWidth - width * scale) / 2;
  const offsetY = previewPadding + (previewSymbolSize - height * scale) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${previewWidth}" height="${previewHeight}" viewBox="0 0 ${previewWidth} ${previewHeight}">
  <rect x="0.5" y="0.5" width="${previewWidth - 1}" height="${previewHeight - 1}" rx="8" fill="#ffffff" stroke="#dfe3e8"/>
  <g transform="translate(${offsetX} ${offsetY}) scale(${scale}) translate(${-minX} ${-minY})">
    ${symbol.body}
  </g>
</svg>
`;
}

function parsedSymbolSVG(response: BridgeResponse): ParsedSVG {
  const symbolMarkup = svgForResponse(response)
    .trim()
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<!doctype[^>]*>/gi, "");
  const match = symbolMarkup.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);

  if (!match) {
    return {
      viewBox: [0, 0, previewSymbolSize, previewSymbolSize],
      body: symbolMarkup,
    };
  }

  const viewBox = match[1].match(/\sviewBox=(["'])(.*?)\1/i)?.[2];
  return {
    viewBox: parseViewBox(viewBox),
    body: match[2],
  };
}

function parseViewBox(viewBox?: string): [number, number, number, number] {
  const numbers = viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (numbers?.length === 4 && numbers.every((value) => Number.isFinite(value)) && numbers[2] > 0 && numbers[3] > 0) {
    return [numbers[0], numbers[1], numbers[2], numbers[3]];
  }
  return [0, 0, previewSymbolSize, previewSymbolSize];
}

function slugForDisplayName(displayName?: string): string {
  const slug = (displayName ?? "generated-symbol")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "generated-symbol";
}

function markdownImageURL(path: string): string {
  return `file://${encodeURI(path)}`;
}

function markdownForSuccess(response: BridgeResponse, previewPath: string): string {
  const credits =
    response.remainingCredits === undefined
      ? ""
      : `\n\n**Remaining credits:** ${response.remainingCredits.toLocaleString()}`;
  return [
    `# ${response.displayName ?? "Generated Symbol"}`,
    `![Generated Symbol Preview](${markdownImageURL(previewPath)})`,
    "The generated SVG is ready to copy, paste, or export.",
    credits.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function markdownForFailure(message: string, code?: string): string {
  const codeLine = code ? `\n\n**Code:** \`${code}\`` : "";
  return `# Generation Failed\n\n${message}${codeLine}`;
}

async function copyReferenceImage(id: string, selectedPaths?: string[]): Promise<string | undefined> {
  const selectedPath = selectedPaths?.[0];
  if (!selectedPath) {
    return undefined;
  }

  const extension = extname(selectedPath) || ".image";
  const relativePath = posix.join("images", `${id}${extension.toLowerCase()}`);
  const targetPath = join(bridgeRootPath(), ...relativePath.split("/"));
  await mkdir(join(bridgeRootPath(), "images"), { recursive: true });
  await copyFile(selectedPath, targetPath);
  return relativePath;
}

async function writeRequest(values: FormValues): Promise<string> {
  const prompt = values.prompt.trim();
  const id = randomUUID();
  const imageRelativePath = await copyReferenceImage(id, values.referenceImage);
  const request: BridgeRequest = {
    schemaVersion: bridgeSchemaVersion,
    id,
    mode: imageRelativePath ? "image" : "text",
    prompt,
    imageRelativePath,
    createdAt: new Date().toISOString(),
  };

  await mkdir(join(bridgeRootPath(), "requests"), { recursive: true });
  await mkdir(join(bridgeRootPath(), "responses"), { recursive: true });
  await unlink(responsePath(id)).catch(() => undefined);
  await writeFile(requestPath(id), `${JSON.stringify(request, null, 2)}\n`, "utf8");
  return id;
}

async function pollResponse(id: string): Promise<BridgeResponse> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < generationTimeoutMs) {
    try {
      const raw = await readFile(responsePath(id), "utf8");
      const response = JSON.parse(raw) as BridgeResponse;
      if (response.schemaVersion !== bridgeSchemaVersion || response.id !== id) {
        throw new Error("Glyph Engine returned an incompatible bridge response.");
      }
      return response;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      await sleep(pollIntervalMs);
    }
  }
  throw new Error("Timed out waiting for Glyph Engine to finish generation.");
}

function previewPathForResponse(response: BridgeResponse): string {
  return join(environment.supportPath, "previews", `${response.id}.svg`);
}

function exportPathForResponse(response: BridgeResponse): string {
  return join(homedir(), "Downloads", "Glyph Engine", `${slugForDisplayName(response.displayName)}.svg`);
}

async function writeSVGFile(path: string, svg: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, svg, "utf8");
}

async function writePreviewFile(response: BridgeResponse): Promise<string> {
  const path = previewPathForResponse(response);
  await writeSVGFile(path, svgForPreview(response));
  return path;
}

async function exportSVG(response: BridgeResponse): Promise<void> {
  const path = exportPathForResponse(response);
  await writeSVGFile(path, svgForResponse(response));
  await showToast(Toast.Style.Success, "Exported SVG", basename(path));
  await showInFinder(path);
}

async function copySVGFile(response: BridgeResponse): Promise<void> {
  const path = exportPathForResponse(response);
  await writeSVGFile(path, svgForResponse(response));
  await Clipboard.copy({ file: path });
  await showToast(Toast.Style.Success, "Copied SVG file", basename(path));
}

function SuccessActionRows({ state, onReset }: { state: SuccessState; onReset: () => void }) {
  const { response, previewPath } = state;
  const detail = <List.Item.Detail markdown={markdownForSuccess(response, previewPath)} />;
  const svg = svgForResponse(response);

  return (
    <List
      isShowingDetail
      navigationTitle={response.displayName ?? "Generated Symbol"}
      searchBarPlaceholder="Choose an action"
    >
      <List.Section title={response.displayName ?? "Generated Symbol"}>
        <List.Item
          title="Copy SVG"
          subtitle="Copy the raw SVG markup"
          icon={Icon.Clipboard}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy SVG" content={svg} />
              <Action.Paste title="Paste SVG" content={svg} />
              <Action title="Export SVG" icon={Icon.Download} onAction={() => exportSVG(response)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Export SVG"
          subtitle="Save to Downloads and reveal in Finder"
          icon={Icon.Download}
          detail={detail}
          actions={
            <ActionPanel>
              <Action title="Export SVG" icon={Icon.Download} onAction={() => exportSVG(response)} />
              <Action.CopyToClipboard title="Copy SVG" content={svg} />
              <Action.Paste title="Paste SVG" content={svg} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Copy SVG File"
          subtitle="Copy the exported .svg file"
          icon={Icon.Document}
          detail={detail}
          actions={
            <ActionPanel>
              <Action title="Copy SVG File" icon={Icon.Document} onAction={() => copySVGFile(response)} />
              <Action title="Export SVG" icon={Icon.Download} onAction={() => exportSVG(response)} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Other">
        {response.sfSymbolsTemplateSVG ? (
          <List.Item
            title="Copy SF Symbols Template"
            subtitle="Copy the importable template SVG"
            icon={Icon.Code}
            detail={detail}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy SF Symbols Template" content={response.sfSymbolsTemplateSVG} />
              </ActionPanel>
            }
          />
        ) : null}
        <List.Item
          title="Open in Glyph Engine"
          icon={Icon.AppWindow}
          detail={detail}
          actions={
            <ActionPanel>
              <Action
                title="Open in Glyph Engine"
                icon={Icon.AppWindow}
                onAction={() => open(`${appURLScheme}://raycast/open`)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Generate Another"
          icon={Icon.ArrowClockwise}
          detail={detail}
          actions={
            <ActionPanel>
              <Action title="Generate Another" icon={Icon.ArrowClockwise} onAction={onReset} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function FailureActions({ response, onReset }: { response: BridgeResponse; onReset: () => void }) {
  return (
    <ActionPanel>
      {response.errorCode === "noCredits" ? (
        <Action
          title="Add Credits in Glyph Engine"
          icon={Icon.CreditCard}
          onAction={() => open(`${appURLScheme}://store`)}
        />
      ) : null}
      <Action title="Open Glyph Engine" icon={Icon.AppWindow} onAction={() => open(`${appURLScheme}://raycast/open`)} />
      <Action title="Try Another Prompt" icon={Icon.ArrowClockwise} onAction={onReset} />
    </ActionPanel>
  );
}

export default function Command() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<BridgeResponse | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  async function handleSubmit(values: FormValues): Promise<boolean> {
    if (!values.prompt.trim()) {
      await showToast(Toast.Style.Failure, "Describe a symbol first");
      return false;
    }

    setIsGenerating(true);
    setSubmissionError(null);
    setResponse(null);
    setSuccessState(null);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating symbol",
      message: "Waiting for Glyph Engine...",
    });

    try {
      const id = await writeRequest(values);
      await open(`${appURLScheme}://raycast/generate?id=${encodeURIComponent(id)}`);
      const bridgeResponse = await pollResponse(id);
      setResponse(bridgeResponse);
      if (bridgeResponse.status === "succeeded") {
        setSuccessState({ response: bridgeResponse, previewPath: await writePreviewFile(bridgeResponse) });
      }
      toast.style = bridgeResponse.status === "succeeded" ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = bridgeResponse.status === "succeeded" ? "Generated symbol" : "Generation failed";
      toast.message = bridgeResponse.displayName ?? bridgeResponse.message;
      return bridgeResponse.status === "succeeded";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown generation error.";
      setSubmissionError(message);
      toast.style = Toast.Style.Failure;
      toast.title = "Generation failed";
      toast.message = message;
      return false;
    } finally {
      setIsGenerating(false);
    }
  }

  if (successState) {
    return (
      <SuccessActionRows
        state={successState}
        onReset={() => {
          setResponse(null);
          setSuccessState(null);
        }}
      />
    );
  }

  if (response?.status === "failed") {
    return (
      <Detail
        markdown={markdownForFailure(
          response.message ?? "Glyph Engine could not generate a symbol.",
          response.errorCode,
        )}
        actions={<FailureActions response={response} onReset={() => setResponse(null)} />}
      />
    );
  }

  if (submissionError) {
    return (
      <Detail
        markdown={markdownForFailure(submissionError)}
        actions={
          <ActionPanel>
            <Action
              title="Open Glyph Engine"
              icon={Icon.AppWindow}
              onAction={() => open(`${appURLScheme}://raycast/open`)}
            />
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => setSubmissionError(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isGenerating}
      navigationTitle="Generate Symbol"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate in Glyph Engine" icon={Icon.Wand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder="Describe the symbol to generate" autoFocus />
      <Form.FilePicker
        id="referenceImage"
        title="Reference Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Description text="Generation uses Glyph Engine credits and saves successful results in the app." />
    </Form>
  );
}
