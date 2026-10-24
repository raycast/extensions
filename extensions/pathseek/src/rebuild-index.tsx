import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getConfiguredIndexRoots,
  saveConfiguredIndexRoots,
} from "./lib/index-roots";
import { readIndex, rebuildIndex, type IndexMetadata } from "./lib/index-store";
import {
  getMissingBinary,
  missingBinaryMessage,
  HOMEBREW_INSTALL_COMMAND,
  HOMEBREW_URL,
} from "./lib/dependency-guide";

type Mode = "loading" | "configure" | "ready" | "building";

function ChooseFolders({
  initialRoots,
  actionTitle,
  onSave,
}: {
  initialRoots: string[];
  actionTitle: string;
  onSave: (roots: string[]) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function submit(values: { folders: string[] }) {
    if (saving) return;
    setSaving(true);
    try {
      const roots = await saveConfiguredIndexRoots(values.folders);
      await onSave(roots);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Folders",
        message: String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={actionTitle}
            icon={Icon.Folder}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Requires fd and fzf (Homebrew: brew install fd fzf). Select the folders to search. Only pressing Build Index runs a scan." />
      <Form.FilePicker
        id="folders"
        title="Index Folders"
        defaultValue={initialRoots}
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

function ChangeFolders({
  roots,
  onSave,
}: {
  roots: string[];
  onSave: (paths: string[]) => void;
}) {
  const { pop } = useNavigation();
  return (
    <ChooseFolders
      initialRoots={roots}
      actionTitle="Save Selected Folders"
      onSave={(paths) => {
        onSave(paths);
        pop();
      }}
    />
  );
}

export default function RebuildIndex() {
  const [mode, setMode] = useState<Mode>("loading");
  const [roots, setRoots] = useState<string[]>([]);
  const [current, setCurrent] = useState<IndexMetadata | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      try {
        const metadata = await readIndex();
        const configured = await getConfiguredIndexRoots(metadata?.roots);
        if (!mounted) return;
        setCurrent(metadata);
        setRoots(configured);
        // Missing index always gets the folder picker, even if a prior selection was saved.
        setMode(metadata && configured.length ? "ready" : "configure");
      } catch (failure) {
        if (mounted) {
          setError(String(failure));
          setMode("configure");
        }
      }
    }
    void initialize();
    return () => {
      mounted = false;
    };
  }, []);

  async function buildIndex(selectedRoots: string[]) {
    setError(undefined);
    setMode("building");
    try {
      // ONLY this user-initiated action invokes fd.
      const metadata = await rebuildIndex(selectedRoots);
      setCurrent(metadata);
      await showToast({
        style: Toast.Style.Success,
        title: "Index Built Successfully",
        message: metadata.count.toLocaleString() + " paths indexed",
      });
    } catch (failure) {
      setError(String(failure));
      await showToast({
        style: Toast.Style.Failure,
        title: "Index Build Failed",
        message: String(failure),
      });
    } finally {
      setMode("ready");
    }
  }

  if (mode === "configure") {
    return (
      <ChooseFolders
        initialRoots={roots}
        actionTitle="Choose Folders and Build Index"
        onSave={(chosen) => {
          setRoots(chosen);
          void buildIndex(chosen);
        }}
      />
    );
  }

  const missingBinary = getMissingBinary(error);

  const markdown =
    mode === "loading"
      ? "# Build Index\n\nReading saved folders. No scan will start automatically."
      : mode === "building"
        ? "# Building Index\n\nRunning fd on your selected folders. The previous index stays available until the new one is complete."
        : [
            "# Build Index",
            "",
            "**Indexing is manual only.** Opening this command, Search Files or Index Status never starts a scan.",
            "",
            "**Selected folders**",
            roots.length
              ? roots.map((root) => "- " + root).join("\n")
              : "No folders selected.",
            "",
            current
              ? "Last successful build: **" +
                new Date(current.createdAt).toLocaleString() +
                "** · **" +
                current.count.toLocaleString() +
                "** indexed paths."
              : "No index exists. Select folders and explicitly build your first index.",
            "",
            "Use **Cmd+K → Change Indexed Folders** to choose different directories. Saving a new selection does not automatically rebuild.",
            ...(error
              ? [
                  "",
                  "## Last Error",
                  missingBinary ? missingBinaryMessage(missingBinary) : error,
                ]
              : []),
          ].join("\n");

  return (
    <Detail
      isLoading={mode === "loading" || mode === "building"}
      markdown={markdown}
      actions={
        mode === "ready" ? (
          <ActionPanel>
            <Action
              title="Rebuild Index Now"
              icon={Icon.ArrowClockwise}
              onAction={() => void buildIndex(roots)}
            />
            <Action.Push
              title="Change Indexed Folders"
              icon={Icon.Folder}
              target={<ChangeFolders roots={roots} onSave={setRoots} />}
            />
            {missingBinary && (
              <>
                <Action.CopyToClipboard
                  title="Copy fd/fzf Install Command"
                  icon={Icon.CopyClipboard}
                  content={HOMEBREW_INSTALL_COMMAND}
                />
                <Action.OpenInBrowser
                  title="How to Install Homebrew"
                  url={HOMEBREW_URL}
                />
              </>
            )}
            {current && (
              <Action.CopyToClipboard
                title="Copy Index Summary"
                content={JSON.stringify(current, null, 2)}
                icon={Icon.CopyClipboard}
              />
            )}
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
