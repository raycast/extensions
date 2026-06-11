import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  getSelectedFinderItems,
  Icon,
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
import { useTransfer } from "./hooks/useTransfer";
import { addRecord, updateRecord } from "./utils/history";
import { buildCrocArgs, getCrocPath } from "./utils/croc";
import {
  buildProgressBar,
  computeFileSize,
  spawnCrocSend,
} from "./utils/process";

// Session ID for stale in_progress record cleanup in transfer-history.tsx.
// Records written from this session must carry this ID so the cleanup routine
// only marks records from *previous* sessions as failed.
const SESSION_ID = Math.random().toString(36).slice(2);

function buildDeepLink(phrase: string): string {
  return `raycast://extensions/wilton/croc-transfer/receive-file?arguments=${encodeURIComponent(JSON.stringify({ code: phrase }))}`;
}

function prepareFilesForSend(paths: string[]): {
  sendPaths: string[];
  tempZips: string[];
} {
  const sendPaths: string[] = [];
  const tempZips: string[] = [];

  for (const p of paths) {
    let isDir = false;
    try {
      isDir = statSync(p).isDirectory();
    } catch {
      /* file gone */
    }

    if (isDir) {
      const folderName = basename(p);
      const zipPath = join(tmpdir(), `${folderName}-${Date.now()}.zip`);
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
    try {
      if (existsSync(z)) unlinkSync(z);
    } catch {
      /* ignore */
    }
  }
}

function SendView({ defaultFiles }: { defaultFiles: string[] }) {
  const transfer = useTransfer();
  const [filePaths, setFilePaths] = useState<string[]>(defaultFiles);
  const [customPhrase, setCustomPhrase] = useState("");
  const [fileLabel, setFileLabel] = useState<string>("");
  const tempZipsRef = useRef<string[]>([]);
  const recordIdRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      cleanupZips(tempZipsRef.current);
    },
    [],
  );

  async function handleSubmit() {
    if (filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
      });
      return;
    }
    const crocPath = getCrocPath();
    if (!crocPath) return;

    const hasDirs = filePaths.some((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    });

    let sendPaths = filePaths;
    let tempZips: string[] = [];

    if (hasDirs) {
      transfer.setZipping();
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Compressing folders…",
      });
      try {
        const result = prepareFilesForSend(filePaths);
        sendPaths = result.sendPaths;
        tempZips = result.tempZips;
        // Clean up zips left over from any previous attempt in this same view
        // (e.g. user cancelled while waiting and is now resubmitting). Without
        // this, the previous batch becomes unreachable when we overwrite the
        // ref below and would only ever be cleaned up at unmount.
        cleanupZips(tempZipsRef.current);
        tempZipsRef.current = tempZips;
        toast.hide();
      } catch (err) {
        transfer.setError(`Failed to zip folder: ${err}`);
        return;
      }
    }

    const label =
      filePaths.length === 1
        ? basename(filePaths[0]) + (hasDirs ? ".zip" : "")
        : `${filePaths.length} items`;
    setFileLabel(label);

    const extraArgs: string[] = [];
    if (customPhrase.trim()) extraArgs.push("--code", customPhrase.trim());
    extraArgs.push(...sendPaths);

    const args = buildCrocArgs("send", extraArgs);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting croc…",
    });

    const proc = spawnCrocSend(
      crocPath,
      args,
      async (p) => {
        transfer.setPhrase(p);
        await Clipboard.copy(p);
        toast.style = Toast.Style.Animated;
        toast.title = "Waiting for receiver";
        toast.message = p;
        const size = computeFileSize(filePaths);
        const record = await addRecord({
          type: "send",
          files: filePaths,
          phrase: p,
          status: "in_progress",
          size,
          sessionId: SESSION_ID,
        });
        recordIdRef.current = record.id;
      },
      (prog) => {
        transfer.setProgress(prog);
        toast.message = `${prog.percent}% · ${prog.speed}`;
      },
      async () => {
        if (recordIdRef.current)
          await updateRecord(recordIdRef.current, { status: "success" });
        cleanupZips(tempZipsRef.current);
        tempZipsRef.current = [];
        transfer.setDone();
        toast.hide();
        const name =
          filePaths.length === 1
            ? basename(filePaths[0])
            : `${filePaths.length} files`;
        await showHUD(`✓ Sent: ${name}`);
      },
      async (err) => {
        if (recordIdRef.current)
          await updateRecord(recordIdRef.current, { status: "failed" });
        cleanupZips(tempZipsRef.current);
        tempZipsRef.current = [];
        transfer.setError(err.message);
        toast.style = Toast.Style.Failure;
        toast.title = "Transfer failed";
        toast.message = err.message;
      },
    );

    transfer.setStarting(proc);
  }

  const { state, phrase, progress, error } = transfer;

  const displayLabel =
    fileLabel ||
    (filePaths.length === 1
      ? (filePaths[0].split("/").pop() ?? filePaths[0])
      : `${filePaths.length} items`);

  if (state === "form") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Send"
              icon={Icon.Upload}
              onSubmit={handleSubmit}
            />
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

  if (state === "zipping") {
    const dirs = filePaths.filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
    return (
      <Detail
        markdown={`Compressing **${dirs.map((d) => basename(d)).join(", ")}** into zip…`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Compressing…"
              icon={{ source: Icon.CircleProgress, tintColor: Color.Orange }}
            />
            <Detail.Metadata.Label
              title="Folders"
              text={dirs.map((d) => basename(d)).join(", ")}
            />
          </Detail.Metadata>
        }
      />
    );
  }

  if (state === "starting") {
    return (
      <Detail
        markdown="Connecting to relay server..."
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Files"
              text={displayLabel}
              icon={Icon.Document}
            />
            <Detail.Metadata.Label
              title="Status"
              text="Starting…"
              icon={{
                source: Icon.CircleProgress,
                tintColor: Color.SecondaryText,
              }}
            />
          </Detail.Metadata>
        }
      />
    );
  }

  if (state === "waiting" && phrase) {
    const deepLink = buildDeepLink(phrase);
    return (
      <Detail
        markdown={`# Ready to Transfer\n\n## \`${phrase}\`\n\nShare this code with the receiver, or send them the **Deep Link** below.\n\nOn the other computer, open Raycast → **Receive File** and enter the code.\n\nOr run in terminal:\n\`\`\`\ncroc ${phrase}\n\`\`\`\n\n---\n**Files**: ${displayLabel}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text="Waiting for receiver"
                color={Color.Orange}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Code Phrase"
              text={phrase}
              icon={Icon.Key}
            />
            <Detail.Metadata.Label
              title="Files"
              text={displayLabel}
              icon={Icon.Document}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Deep Link"
              target={deepLink}
              text="Open in Raycast"
            />
            <Detail.Metadata.Label
              title="Tip"
              text="Code phrase copied to clipboard"
              icon={Icon.Clipboard}
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Share">
              <Action
                title="Copy Code Phrase"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(phrase!);
                  await showHUD(`Copied: ${phrase}`);
                }}
              />
              <Action
                title="Copy Deep Link"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(deepLink);
                  await showHUD("Deep Link copied!");
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Cancel Transfer"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={() => transfer.cancel(filePaths)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  if (state === "transferring" && phrase) {
    const pct = progress?.percent ?? 0;
    const bar = buildProgressBar(pct);
    const sizeInfo =
      progress?.transferred && progress?.total
        ? `**${progress.transferred}** / ${progress.total}`
        : "";
    const speedInfo = progress?.speed ? `${progress.speed}` : "";
    const etaInfo = progress?.eta ? `${progress.eta} remaining` : "";
    const statsLine = [sizeInfo, speedInfo, etaInfo]
      .filter(Boolean)
      .join("  \u00B7  ");

    return (
      <Detail
        markdown={`## Transferring ${displayLabel}\n\n\`${bar}\` ${pct}%\n\n${statsLine}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text="Transferring"
                color={Color.Blue}
              />
              <Detail.Metadata.TagList.Item
                text={`${pct}%`}
                color={pct >= 80 ? Color.Green : Color.Blue}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Code Phrase"
              text={phrase}
              icon={Icon.Key}
            />
            <Detail.Metadata.Label
              title="Files"
              text={displayLabel}
              icon={Icon.Document}
            />
            <Detail.Metadata.Separator />
            {progress?.speed && (
              <Detail.Metadata.Label
                title="Speed"
                text={progress.speed}
                icon={Icon.Gauge}
              />
            )}
            {progress?.eta && (
              <Detail.Metadata.Label
                title="ETA"
                text={progress.eta}
                icon={Icon.Clock}
              />
            )}
            {progress?.elapsed && (
              <Detail.Metadata.Label
                title="Elapsed"
                text={progress.elapsed}
                icon={Icon.Stopwatch}
              />
            )}
            {progress?.transferred && progress?.total && (
              <Detail.Metadata.Label
                title="Transferred"
                text={`${progress.transferred} / ${progress.total}`}
              />
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
              onAction={() => transfer.cancel(filePaths)}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === "done") {
    const deepLink = phrase ? buildDeepLink(phrase) : null;
    return (
      <Detail
        markdown={`# Transfer Complete\n\n**${displayLabel}** was sent successfully.`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text="Complete"
                color={Color.Green}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Files"
              text={displayLabel}
              icon={Icon.Document}
            />
            {phrase && (
              <Detail.Metadata.Label
                title="Code Phrase"
                text={phrase}
                icon={Icon.Key}
              />
            )}
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
                  onAction={async () => {
                    await Clipboard.copy(phrase!);
                    await showHUD(`Copied: ${phrase}`);
                  }}
                />
              )}
              {deepLink && (
                <Action
                  title="Copy Deep Link"
                  icon={Icon.Link}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy(deepLink);
                    await showHUD("Deep Link copied!");
                  }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Send Another File"
                icon={Icon.Upload}
                onAction={() => transfer.setForm()}
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
      markdown={`# Transfer Failed\n\n\`\`\`\n${error}\n\`\`\``}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text="Failed"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          />
          <Detail.Metadata.Label title="Files" text={displayLabel} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            onAction={() => transfer.setForm()}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SendFile() {
  const { isChecking, isInstalled, recheck } = useCrocCheck();
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

  if (isChecking || !finderChecked)
    return <Detail markdown="Checking croc installation..." />;
  if (!isInstalled) return <InstallGuide onCrocFound={recheck} />;
  return <SendView defaultFiles={finderFiles ?? []} />;
}
