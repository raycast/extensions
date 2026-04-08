import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  LaunchProps,
  List,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { basename, join } from "path";
import { useEffect, useRef, useState } from "react";
import { InstallGuide } from "./components/InstallGuide";
import { useCrocCheck } from "./hooks/useCrocCheck";
import { useTransferHistory } from "./hooks/useTransferHistory";
import { addRecord } from "./utils/history";
import { buildCrocArgs, getCrocPath, getPrefs } from "./utils/croc";
import { buildProgressBar, CrocProcess, spawnCrocReceive, TransferProgress } from "./utils/process";

type ReceiveState = "input" | "receiving" | "done" | "error";

/** Extract a croc code phrase from arbitrary clipboard text.
 *  Handles: "Code is: 1368-paris-profit-lorenzo", "1368-paris-profit-lorenzo", URLs with codes, etc.
 *  croc codes are hyphen-separated tokens starting with a number segment.
 */
function extractCrocCode(text: string): string | null {
  const cleaned = text.trim();
  // Remove "Code is:" or "CROC_SECRET=" prefix
  const stripped = cleaned
    .replace(/^Code\s+is:\s*/i, "")
    .replace(/^CROC_SECRET\s*=\s*["']?/i, "")
    .replace(/["']?\s*$/, "")
    .trim();

  // Match a croc code: starts with digits, followed by 1+ hyphen-word groups
  const match = stripped.match(/^(\d+-(?:[a-z]+-)*[a-z]+)$/i)
    ?? stripped.match(/(\d+-(?:[a-z]+-)*[a-z]+)/i);

  return match ? match[1].toLowerCase() : null;
}

export default function ReceiveFile(props: LaunchProps<{ arguments: { code?: string } }>) {
  const { isChecking, isInstalled } = useCrocCheck();
  const { history } = useTransferHistory();
  const [searchText, setSearchText] = useState("");
  const [clipboardCode, setClipboardCode] = useState<string | null>(null);
  const [state, setState] = useState<ReceiveState>("input");
  const [activePhrase, setActivePhrase] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const procRef = useRef<CrocProcess | null>(null);

  const prefs = getPrefs();
  const downloadDir = join(
    (prefs.downloadDirectory || "~/Downloads").replace(/^~/, process.env.HOME ?? "~"),
    "Share"
  );

  useEffect(() => () => { procRef.current?.kill(); }, []);

  // Deep Link: auto-start receive if code argument is provided
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const argCode = props.arguments?.code?.trim();
    if (argCode) {
      const extracted = extractCrocCode(argCode);
      if (extracted) {
        deepLinkHandled.current = true;
        startReceive(extracted);
        return;
      }
    }
  }, []);

  // Read clipboard on mount, extract code if present
  useEffect(() => {
    if (deepLinkHandled.current) return;
    Clipboard.readText().then((text) => {
      if (text) {
        const code = extractCrocCode(text);
        if (code) setClipboardCode(code);
      }
    }).catch(() => { /* clipboard unavailable */ });
  }, []);

  async function startReceive(phrase: string) {
    const crocPath = getCrocPath();
    if (!crocPath) return;

    const trimmed = phrase.trim();
    setActivePhrase(trimmed);
    setState("receiving");
    setProgress(null);

    const args = buildCrocArgs("receive", []);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting…", message: trimmed });

    procRef.current = spawnCrocReceive(
      crocPath, args, trimmed, downloadDir,
      (p) => {
        setProgress(p);
        toast.message = `${p.percent}% · ${p.speed}`;
      },
      async (result) => {
        const files = result.files ?? [];
        setReceivedFiles(files);
        setState("done");
        toast.style = Toast.Style.Success;
        toast.title = "Files received!";
        toast.message = files.length > 0 ? basename(files[0]) : downloadDir;
        await addRecord({ type: "receive", files, phrase: trimmed, status: "success" });
      },
      async (err) => {
        setErrorMsg(err.message);
        setState("error");
        toast.style = Toast.Style.Failure;
        toast.title = "Transfer failed";
        toast.message = err.message;
        await addRecord({ type: "receive", files: [], phrase: trimmed, status: "failed" });
      }
    );
  }

  if (isChecking) return <Detail markdown="Checking croc installation..." />;
  if (!isInstalled) return <InstallGuide />;

  if (state === "receiving") {
    const pct = progress?.percent ?? 0;
    const bar = buildProgressBar(pct);
    const sizeInfo = progress?.transferred && progress?.total ? `**${progress.transferred}** / ${progress.total}` : "";
    const speedInfo = progress?.speed || "";
    const etaInfo = progress?.eta ? `${progress.eta} remaining` : "";
    const statsLine = [sizeInfo, speedInfo, etaInfo].filter(Boolean).join("  \u00B7  ");

    const md = progress
      ? `## Receiving Files\n\n\`${bar}\` ${pct}%\n\n${statsLine}`
      : `## Connecting to Sender\n\nWaiting for **${activePhrase}** to become available…`;

    return (
      <Detail
        markdown={md}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Code Phrase" text={activePhrase} icon={Icon.Key} />
            <Detail.Metadata.Separator />
            {progress ? (
              <>
                <Detail.Metadata.TagList title="Status">
                  <Detail.Metadata.TagList.Item text="Receiving" color={Color.Blue} />
                  <Detail.Metadata.TagList.Item text={`${pct}%`} color={pct >= 80 ? Color.Green : Color.Blue} />
                </Detail.Metadata.TagList>
                {progress.speed && <Detail.Metadata.Label title="Speed" text={progress.speed} icon={Icon.Gauge} />}
                {progress.eta && <Detail.Metadata.Label title="ETA" text={progress.eta} icon={Icon.Clock} />}
                {progress.elapsed && <Detail.Metadata.Label title="Elapsed" text={progress.elapsed} icon={Icon.Stopwatch} />}
                {progress.transferred && progress.total && (
                  <Detail.Metadata.Label title="Transferred" text={`${progress.transferred} / ${progress.total}`} />
                )}
              </>
            ) : (
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item text="Connecting" color={Color.Orange} />
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Save to" text={downloadDir} icon={Icon.Folder} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => { procRef.current?.kill(); setState("input"); }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === "done") {
    const fileList = receivedFiles.length > 0
      ? receivedFiles.map((f) => `- \`${basename(f)}\``).join("\n")
      : "Files saved to download folder.";
    return (
      <Detail
        markdown={`# Files Received\n\n${fileList}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text="Complete" icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Code Phrase" text={activePhrase} />
            <Detail.Metadata.Label title="Saved to" text={downloadDir} icon="📥" />
            {receivedFiles.length > 0 && (
              <Detail.Metadata.Label title="Files" text={`${receivedFiles.length} file${receivedFiles.length > 1 ? "s" : ""}`} />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Open Download Folder"
              icon="📥"
              onAction={() => open(downloadDir)}
            />
            <Action
              title="Receive Another"
              icon={Icon.Download}
              onAction={() => { setState("input"); setReceivedFiles([]); }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === "error") {
    return (
      <Detail
        markdown={`# Transfer Failed\n\n\`\`\`\n${errorMsg}\n\`\`\``}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text="Failed" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} />
            <Detail.Metadata.Label title="Code Phrase" text={activePhrase} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => { setState("input"); setErrorMsg(null); }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Input state
  const trimmed = searchText.trim();
  const isTyping = trimmed.length > 0;
  const isValidPhrase = trimmed.length > 2;

  // Recent phrases from history (unique, last 5 receives)
  const recentPhrases = [...new Map(
    history
      .filter((r) => r.type === "receive" && r.status === "success")
      .map((r) => [r.phrase, r])
  ).values()].slice(0, 5);

  const showClipboard = !isTyping && clipboardCode !== null;
  const showRecent = !isTyping && recentPhrases.length > 0;
  const showEmpty = !isTyping && !showClipboard && !showRecent;

  return (
    <List
      searchBarPlaceholder="Enter code phrase (e.g. 3-panda-brave-story)"
      onSearchTextChange={setSearchText}
    >
      {showEmpty && (
        <List.EmptyView
          icon={Icon.Download}
          title="Enter Code Phrase"
          description="Type the phrase from the sender, then press Enter."
        />
      )}

      {/* Typed phrase takes priority */}
      {isValidPhrase && (
        <List.Section title="Receive">
          <List.Item
            icon={{ source: Icon.Download, tintColor: Color.Blue }}
            title={trimmed}
            subtitle="Press ↵ to start receiving"
            actions={
              <ActionPanel>
                <Action title="Receive Files" icon={Icon.Download} onAction={() => startReceive(trimmed)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Clipboard code — shown when nothing is typed */}
      {showClipboard && (
        <List.Section title="From Clipboard">
          <List.Item
            icon={{ source: Icon.Clipboard, tintColor: Color.Blue }}
            title={clipboardCode!}
            subtitle="Detected from clipboard · Press ↵ to receive"
            actions={
              <ActionPanel>
                <Action
                  title="Receive Files"
                  icon={Icon.Download}
                  onAction={() => startReceive(clipboardCode!)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Recent history */}
      {showRecent && (
        <List.Section title="Recent" subtitle={`${recentPhrases.length}`}>
          {recentPhrases.map((r) => (
            <List.Item
              key={r.id}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              title={r.phrase}
              subtitle={r.files.length > 0 ? basename(r.files[0]) : undefined}
              actions={
                <ActionPanel>
                  <Action title="Receive Again" icon={Icon.Download} onAction={() => startReceive(r.phrase)} />
                  <Action
                    title="Copy Phrase"
                    icon={Icon.Clipboard}
                    onAction={async () => { await Clipboard.copy(r.phrase); await showHUD(`Copied: ${r.phrase}`); }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
