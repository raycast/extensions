import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  LaunchProps,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { basename } from "path";
import { useEffect, useRef, useState } from "react";
import { InstallGuide } from "./components/InstallGuide";
import { useCrocCheck } from "./hooks/useCrocCheck";
import { addRecord } from "./utils/history";
import { buildCrocArgs, getCrocPath, getPrefs } from "./utils/croc";
import {
  buildProgressBar,
  CrocProcess,
  spawnCrocReceive,
  TransferProgress,
} from "./utils/process";

// Session ID for stale in_progress record cleanup in transfer-history.tsx.
// Carried on every record this view writes so cleanup never marks records from
// the active session as failed (mirrors quick-send.ts and send-file.tsx).
const SESSION_ID = Math.random().toString(36).slice(2);

type ReceiveState = "input" | "receiving" | "done" | "error";

function extractCrocCode(text: string): string | null {
  const cleaned = text.trim();
  const stripped = cleaned
    .replace(/^Code\s+is:\s*/i, "")
    .replace(/^CROC_SECRET\s*=\s*["']?/i, "")
    .replace(/["']?\s*$/, "")
    .trim();

  const match =
    stripped.match(/^(\d+-(?:[a-z]+-)*[a-z]+)$/i) ??
    stripped.match(/(\d+-(?:[a-z]+-)*[a-z]+)/i);

  return match ? match[1].toLowerCase() : null;
}

export default function ReceiveFile(
  props: LaunchProps<{ arguments: { code?: string } }>,
) {
  const { isChecking, isInstalled, recheck } = useCrocCheck();
  const [codeInput, setCodeInput] = useState("");
  const [state, setState] = useState<ReceiveState>("input");
  const [activePhrase, setActivePhrase] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const procRef = useRef<CrocProcess | null>(null);
  const deepLinkHandled = useRef(false);

  const prefs = getPrefs();
  const downloadDir = (prefs.downloadDirectory || "~/Downloads/Share").replace(
    /^~/,
    process.env.HOME ?? "~",
  );

  useEffect(
    () => () => {
      procRef.current?.kill();
    },
    [],
  );

  // Deep link: auto-start
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const argCode = props.arguments?.code?.trim();
    if (argCode) {
      const extracted = extractCrocCode(argCode);
      if (extracted) {
        deepLinkHandled.current = true;
        startReceive(extracted);
      }
    }
  }, []);

  // Pre-fill from clipboard
  useEffect(() => {
    if (deepLinkHandled.current) return;
    Clipboard.readText()
      .then((text) => {
        if (text) {
          const code = extractCrocCode(text);
          if (code) setCodeInput(code);
        }
      })
      .catch(() => {
        /* clipboard unavailable */
      });
  }, []);

  async function startReceive(phrase: string) {
    const crocPath = getCrocPath();
    if (!crocPath) return;

    const trimmed = phrase.trim();
    setActivePhrase(trimmed);
    setState("receiving");
    setProgress(null);

    const args = buildCrocArgs("receive");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Connecting…",
      message: trimmed,
    });

    procRef.current = spawnCrocReceive(
      crocPath,
      args,
      trimmed,
      downloadDir,
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
        await addRecord({
          type: "receive",
          files,
          phrase: trimmed,
          status: "success",
          sessionId: SESSION_ID,
        });
      },
      async (err) => {
        setErrorMsg(err.message);
        setState("error");
        toast.style = Toast.Style.Failure;
        toast.title = "Transfer failed";
        toast.message = err.message;
        await addRecord({
          type: "receive",
          files: [],
          phrase: trimmed,
          status: "failed",
          sessionId: SESSION_ID,
        });
      },
    );
  }

  function handleCancel() {
    procRef.current?.kill();
    if (activePhrase) {
      addRecord({
        type: "receive",
        files: [],
        phrase: activePhrase,
        status: "cancelled",
        sessionId: SESSION_ID,
      });
    }
    setState("input");
    setProgress(null);
  }

  if (isChecking) return <Detail markdown="Checking croc installation..." />;
  if (!isInstalled) return <InstallGuide onCrocFound={recheck} />;

  if (state === "receiving") {
    const pct = progress?.percent ?? 0;
    const bar = buildProgressBar(pct);
    const sizeInfo =
      progress?.transferred && progress?.total
        ? `**${progress.transferred}** / ${progress.total}`
        : "";
    const speedInfo = progress?.speed || "";
    const etaInfo = progress?.eta ? `${progress.eta} remaining` : "";
    const statsLine = [sizeInfo, speedInfo, etaInfo]
      .filter(Boolean)
      .join("  \u00B7  ");

    const md = progress
      ? `## Receiving Files\n\n\`${bar}\` ${pct}%\n\n${statsLine}`
      : `## Connecting to Sender\n\nWaiting for **${activePhrase}** to become available…`;

    return (
      <Detail
        markdown={md}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Code Phrase"
              text={activePhrase}
              icon={Icon.Key}
            />
            <Detail.Metadata.Separator />
            {progress ? (
              <>
                <Detail.Metadata.TagList title="Status">
                  <Detail.Metadata.TagList.Item
                    text="Receiving"
                    color={Color.Blue}
                  />
                  <Detail.Metadata.TagList.Item
                    text={`${pct}%`}
                    color={pct >= 80 ? Color.Green : Color.Blue}
                  />
                </Detail.Metadata.TagList>
                {progress.speed && (
                  <Detail.Metadata.Label
                    title="Speed"
                    text={progress.speed}
                    icon={Icon.Gauge}
                  />
                )}
                {progress.eta && (
                  <Detail.Metadata.Label
                    title="ETA"
                    text={progress.eta}
                    icon={Icon.Clock}
                  />
                )}
                {progress.elapsed && (
                  <Detail.Metadata.Label
                    title="Elapsed"
                    text={progress.elapsed}
                    icon={Icon.Stopwatch}
                  />
                )}
                {progress.transferred && progress.total && (
                  <Detail.Metadata.Label
                    title="Transferred"
                    text={`${progress.transferred} / ${progress.total}`}
                  />
                )}
              </>
            ) : (
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text="Connecting"
                  color={Color.Orange}
                />
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Save to"
              text={downloadDir}
              icon={Icon.Folder}
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={handleCancel}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === "done") {
    const fileList =
      receivedFiles.length > 0
        ? receivedFiles.map((f) => `- \`${basename(f)}\``).join("\n")
        : "Files saved to download folder.";
    const firstFile = receivedFiles[0];
    return (
      <Detail
        markdown={`# Files Received\n\n${fileList}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Complete"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Code Phrase" text={activePhrase} />
            <Detail.Metadata.Label
              title="Saved to"
              text={downloadDir}
              icon="📥"
            />
            {receivedFiles.length > 0 && (
              <Detail.Metadata.Label
                title="Files"
                text={`${receivedFiles.length} file${receivedFiles.length > 1 ? "s" : ""}`}
              />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            {firstFile && (
              <Action
                title="Reveal in Finder"
                icon={Icon.Finder}
                onAction={() => showInFinder(firstFile)}
              />
            )}
            <Action
              title="Receive Another"
              icon={Icon.Download}
              onAction={() => {
                setState("input");
                setReceivedFiles([]);
              }}
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
            <Detail.Metadata.Label
              title="Status"
              text="Failed"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            />
            <Detail.Metadata.Label title="Code Phrase" text={activePhrase} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setState("input");
                setErrorMsg(null);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Input state — Form with pre-filled code
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Receive"
            icon={Icon.Download}
            onSubmit={() => {
              const trimmed = codeInput.trim();
              if (!trimmed) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a code phrase",
                });
                return;
              }
              startReceive(trimmed);
            }}
          />
          <Action
            title="Copy Phrase"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              if (codeInput.trim()) {
                await Clipboard.copy(codeInput.trim());
                await showHUD(`Copied: ${codeInput.trim()}`);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="code"
        title="Code Phrase"
        placeholder="e.g. 3-panda-brave-story"
        autoFocus
        value={codeInput}
        onChange={setCodeInput}
      />
      <Form.Description text="Enter the code phrase from the sender, then press ↵ to start receiving." />
    </Form>
  );
}
