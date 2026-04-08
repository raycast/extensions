import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  getSelectedFinderItems,
  Icon,
  Keyboard,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFileSync } from "child_process";
import { statSync, unlinkSync, existsSync } from "fs";
import { basename, join } from "path";
import { tmpdir } from "os";
import { useEffect, useRef, useState } from "react";
import { InstallGuide } from "./components/InstallGuide";
import { useCrocCheck } from "./hooks/useCrocCheck";
import { addRecord } from "./utils/history";
import { buildCrocArgs, getCrocPath } from "./utils/croc";
import { buildProgressBar, CrocProcess, spawnCrocSend, TransferProgress } from "./utils/process";

type SendState = "form" | "zipping" | "starting" | "waiting" | "transferring" | "done" | "error";

function buildDeepLink(phrase: string): string {
  return `raycast://extensions/wilton/croc-transfer/receive-file?arguments=${encodeURIComponent(JSON.stringify({ code: phrase }))}`;
}

/**
 * For each path: if it's a directory, zip it to a temp file.
 * Returns { sendPaths, tempZips } where tempZips are cleaned up after send.
 */
function prepareFilesForSend(paths: string[]): { sendPaths: string[]; tempZips: string[] } {
  const sendPaths: string[] = [];
  const tempZips: string[] = [];

  for (const p of paths) {
    let isDir = false;
    try { isDir = statSync(p).isDirectory(); } catch { /* file gone */ }

    if (isDir) {
      const folderName = basename(p);
      const zipPath = join(tmpdir(), `${folderName}-${Date.now()}.zip`);
      // -r recursive, -q quiet, path relative so zip doesn't include full absolute path
      execFileSync("/usr/bin/zip", ["-rq", zipPath, "."], { cwd: p });
      sendPaths.push(zipPath);
      tempZips.push(zipPath);
    } else {
      sendPaths.push(p);
    }
  }

  return { sendPaths, tempZips };
}

function cleanupZips(zips: string[]) {
  for (const z of zips) {
    try { if (existsSync(z)) unlinkSync(z); } catch { /* ignore */ }
  }
}

function SendView({ defaultFiles }: { defaultFiles: string[] }) {
  const [state, setState] = useState<SendState>("form");
  const [filePaths, setFilePaths] = useState<string[]>(defaultFiles);
  const [customPhrase, setCustomPhrase] = useState("");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string>("");
  const procRef = useRef<CrocProcess | null>(null);
  const tempZipsRef = useRef<string[]>([]);

  useEffect(() => () => {
    procRef.current?.kill();
    cleanupZips(tempZipsRef.current);
  }, []);

  async function handleSubmit() {
    if (filePaths.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No files selected" });
      return;
    }
    const crocPath = getCrocPath();
    if (!crocPath) return;

    // Check if any directories need zipping
    const hasDirs = filePaths.some((p) => { try { return statSync(p).isDirectory(); } catch { return false; } });

    let sendPaths = filePaths;
    let tempZips: string[] = [];

    if (hasDirs) {
      setState("zipping");
      const toast = await showToast({ style: Toast.Style.Animated, title: "Compressing folders…" });
      try {
        const result = prepareFilesForSend(filePaths);
        sendPaths = result.sendPaths;
        tempZips = result.tempZips;
        tempZipsRef.current = tempZips;
        toast.style = Toast.Style.Animated;
        toast.title = "Starting croc…";
      } catch (err) {
        setState("error");
        setErrorMsg(`Failed to zip folder: ${err}`);
        toast.style = Toast.Style.Failure;
        toast.title = "Zip failed";
        return;
      }
    }

    // Build display label using original paths
    const label = filePaths.length === 1
      ? (basename(filePaths[0]) + (hasDirs ? ".zip" : ""))
      : `${filePaths.length} items`;
    setFileLabel(label);

    setState("starting");
    const extraArgs: string[] = [];
    if (customPhrase.trim()) extraArgs.push("--code", customPhrase.trim());
    extraArgs.push(...sendPaths);

    const args = buildCrocArgs("send", extraArgs);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting croc…" });

    procRef.current = spawnCrocSend(
      crocPath, args,
      async (p) => {
        setPhrase(p);
        setState("waiting");
        await Clipboard.copy(p);
        toast.style = Toast.Style.Animated;
        toast.title = "Waiting for receiver";
        toast.message = p;
        await addRecord({ type: "send", files: filePaths, phrase: p, status: "success" });
      },
      (prog) => {
        setProgress(prog);
        setState("transferring");
        toast.message = `${prog.percent}% · ${prog.speed}`;
      },
      async () => {
        cleanupZips(tempZipsRef.current);
        tempZipsRef.current = [];
        setState("done");
        toast.style = Toast.Style.Success;
        toast.title = "Transfer complete";
        toast.message = undefined;
      },
      async (err) => {
        cleanupZips(tempZipsRef.current);
        tempZipsRef.current = [];
        setErrorMsg(err.message);
        setState("error");
        toast.style = Toast.Style.Failure;
        toast.title = "Transfer failed";
        toast.message = err.message;
        if (phrase) await addRecord({ type: "send", files: filePaths, phrase, status: "failed" });
      }
    );
  }

  if (state === "form") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Send" icon={Icon.Upload} onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.FilePicker
          id="files"
          title="Files or Folders"
          value={filePaths}
          onChange={setFilePaths}
          allowMultipleSelection
          canChooseDirectories
        />
        <Form.TextField
          id="customPhrase"
          title="Custom Code Phrase"
          placeholder="Leave empty to auto-generate"
          value={customPhrase}
          onChange={setCustomPhrase}
        />
        <Form.Description text="Tip: Select files in Finder before opening this command to skip the picker." />
      </Form>
    );
  }

  // Zipping state
  if (state === "zipping") {
    const dirs = filePaths.filter((p) => { try { return statSync(p).isDirectory(); } catch { return false; } });
    return (
      <Detail
        markdown={`Compressing **${dirs.map((d) => basename(d)).join(", ")}** into zip…`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text="Compressing…" icon={{ source: Icon.CircleProgress, tintColor: Color.Orange }} />
            <Detail.Metadata.Label title="Folders" text={dirs.map((d) => basename(d)).join(", ")} />
          </Detail.Metadata>
        }
      />
    );
  }

  const displayLabel = fileLabel || (filePaths.length === 1
    ? (filePaths[0].split("/").pop() ?? filePaths[0])
    : `${filePaths.length} items`);

  // Starting: no phrase yet
  if (state === "starting") {
    return (
      <Detail
        markdown="Connecting to relay server..."
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Files" text={displayLabel} icon={Icon.Document} />
            <Detail.Metadata.Label title="Status" text="Starting…" icon={{ source: Icon.CircleProgress, tintColor: Color.SecondaryText }} />
          </Detail.Metadata>
        }
      />
    );
  }

  // Waiting for receiver
  if (state === "waiting" && phrase) {
    const deepLink = buildDeepLink(phrase);
    return (
      <Detail
        markdown={`# Ready to Transfer\n\n## \`${phrase}\`\n\nShare this code with the receiver, or send them the **Deep Link** below.\n\nOn the other computer, open Raycast → **Receive File** and enter the code.\n\nOr run in terminal:\n\`\`\`\ncroc ${phrase}\n\`\`\`\n\n---\n**Files**: ${displayLabel}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Waiting for receiver" color={Color.Orange} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Code Phrase" text={phrase} icon={Icon.Key} />
            <Detail.Metadata.Label title="Files" text={displayLabel} icon={Icon.Document} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Deep Link" target={deepLink} text="Open in Raycast" />
            <Detail.Metadata.Label title="Tip" text="Code phrase copied to clipboard" icon={Icon.Clipboard} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Share">
              <Action
                title="Copy Code Phrase"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () => { await Clipboard.copy(phrase!); await showHUD(`Copied: ${phrase}`); }}
              />
              <Action
                title="Copy Deep Link"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => { await Clipboard.copy(deepLink); await showHUD("Deep Link copied!"); }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Cancel Transfer"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={() => { procRef.current?.kill(); setState("form"); setPhrase(null); }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  // Transferring
  if (state === "transferring" && phrase) {
    const pct = progress?.percent ?? 0;
    const bar = buildProgressBar(pct);
    const sizeInfo = progress?.transferred && progress?.total ? `**${progress.transferred}** / ${progress.total}` : "";
    const speedInfo = progress?.speed ? `${progress.speed}` : "";
    const etaInfo = progress?.eta ? `${progress.eta} remaining` : "";
    const statsLine = [sizeInfo, speedInfo, etaInfo].filter(Boolean).join("  \u00B7  ");

    return (
      <Detail
        markdown={`## Transferring ${displayLabel}\n\n\`${bar}\` ${pct}%\n\n${statsLine}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Transferring" color={Color.Blue} />
              <Detail.Metadata.TagList.Item text={`${pct}%`} color={pct >= 80 ? Color.Green : Color.Blue} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Code Phrase" text={phrase} icon={Icon.Key} />
            <Detail.Metadata.Label title="Files" text={displayLabel} icon={Icon.Document} />
            <Detail.Metadata.Separator />
            {progress?.speed && <Detail.Metadata.Label title="Speed" text={progress.speed} icon={Icon.Gauge} />}
            {progress?.eta && <Detail.Metadata.Label title="ETA" text={progress.eta} icon={Icon.Clock} />}
            {progress?.elapsed && <Detail.Metadata.Label title="Elapsed" text={progress.elapsed} icon={Icon.Stopwatch} />}
            {progress?.transferred && progress?.total && (
              <Detail.Metadata.Label title="Transferred" text={`${progress.transferred} / ${progress.total}`} />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Cancel Transfer"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => { procRef.current?.kill(); setState("form"); setPhrase(null); setProgress(null); }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Done
  if (state === "done") {
    const deepLink = phrase ? buildDeepLink(phrase) : null;
    return (
      <Detail
        markdown={`# Transfer Complete\n\n**${displayLabel}** was sent successfully.`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Complete" color={Color.Green} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Files" text={displayLabel} icon={Icon.Document} />
            {phrase && <Detail.Metadata.Label title="Code Phrase" text={phrase} icon={Icon.Key} />}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Share">
              {phrase && (
                <Action
                  title="Copy Code Phrase"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={async () => { await Clipboard.copy(phrase!); await showHUD(`Copied: ${phrase}`); }}
                />
              )}
              {deepLink && (
                <Action
                  title="Copy Deep Link"
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={async () => { await Clipboard.copy(deepLink); await showHUD("Deep Link copied!"); }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Send Another File"
                icon={Icon.Upload}
                onAction={() => { setState("form"); setPhrase(null); setProgress(null); }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  // Error
  return (
    <Detail
      markdown={`# Transfer Failed\n\n\`\`\`\n${errorMsg}\n\`\`\``}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text="Failed" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} />
          <Detail.Metadata.Label title="Files" text={displayLabel} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            onAction={() => { setState("form"); setErrorMsg(null); }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SendFile() {
  const { isChecking, isInstalled } = useCrocCheck();
  const [finderFiles, setFinderFiles] = useState<string[] | null>(null);
  const [finderChecked, setFinderChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const items = await getSelectedFinderItems();
        setFinderFiles(items.map((i) => i.path));
      } catch {
        setFinderFiles([]);
      }
      setFinderChecked(true);
    })();
  }, []);

  if (isChecking || !finderChecked) return <Detail markdown="Checking croc installation..." />;
  if (!isInstalled) return <InstallGuide />;
  return <SendView defaultFiles={finderFiles ?? []} />;
}
