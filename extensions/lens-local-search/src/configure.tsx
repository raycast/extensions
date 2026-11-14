import {
  Action,
  ActionPanel,
  environment,
  Form,
  LaunchType,
  launchCommand,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { prepareLocalRanking } from "./jobs";
import { readConfiguration, saveFolders, type Folders } from "./settings";

export default function ConfigureFolders({
  onSaved,
}: { onSaved?: () => void } = {}) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<Folders>({
    roots: [],
    codeRoots: [],
    excludedFolders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [rankingStatus, setRankingStatus] = useState<string>();
  const rankingController = useRef<AbortController | null>(null);
  useEffect(() => () => rankingController.current?.abort(), []);
  async function prepareRanking() {
    if (rankingController.current) return;
    const controller = new AbortController();
    rankingController.current = controller;
    setLoading(true);
    setRankingStatus("Preparing download…");
    try {
      await prepareLocalRanking(
        await readConfiguration(),
        (event) => {
          if (
            event.event === "progress" &&
            typeof event.all_bytes === "number" &&
            typeof event.all_total === "number" &&
            event.all_total > 0
          )
            setRankingStatus(
              `Downloading model… ${Math.round((event.all_bytes / event.all_total) * 100)}%`,
            );
          else if (event.event === "optimizing")
            setRankingStatus("Optimizing the local model…");
          else if (event.event === "verifying")
            setRankingStatus("Checking model integrity…");
          else if (event.event === "waiting" || event.event === "retry")
            setRankingStatus("Waiting for the download to resume…");
        },
        controller.signal,
      );
      setRankingStatus("Local ranking is ready. Reopen Search to use it.");
    } catch (error) {
      if (!controller.signal.aborted)
        setRankingStatus(
          `Setup failed: ${error instanceof Error ? error.message : "Try again."}`,
        );
    } finally {
      rankingController.current = null;
      setLoading(false);
    }
  }

  useEffect(() => {
    readConfiguration()
      .then((config) =>
        setFolders({
          roots: config.roots,
          codeRoots: config.codeRoots,
          excludedFolders: config.excluded,
        }),
      )
      .catch((error: unknown) =>
        setError(
          error instanceof Error ? error.message : "Unable to read folders.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  async function save() {
    if (!folders.roots.length && !folders.codeRoots.length) {
      setError("Choose at least one folder.");
      return;
    }
    try {
      await saveFolders(folders);
      if (environment.commandName === "search") {
        onSaved?.();
        pop();
      }
      await launchCommand({
        name: "index-files",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to save folders.",
      );
    }
  }
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Index" onSubmit={save} />
          <Action
            title="Download Local Ranking Model (2.66 GB)"
            onAction={prepareRanking}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Local Search"
        text="Choose only the folders you want to search. The local AI model downloads once (865 MB). Raycast checks for changes every five minutes. No separate app is required."
      />
      <Form.Description
        title="Local Content Ranking"
        text={
          rankingStatus ??
          "Optional: choose Download Local Ranking Model in Actions (2.66 GB download, plus conversion space). The Local Content Ranking preference controls its use. Closing this view stops setup; you can retry to resume."
        }
      />
      <Form.FilePicker
        id="folders"
        title="Files and Media"
        canChooseDirectories
        canChooseFiles={false}
        value={folders.roots}
        onChange={(roots) => {
          setError(undefined);
          setFolders((value) => ({ ...value, roots }));
        }}
        error={error}
      />
      <Form.FilePicker
        id="code"
        title="Code Folders"
        canChooseDirectories
        canChooseFiles={false}
        value={folders.codeRoots}
        onChange={(codeRoots) => {
          setError(undefined);
          setFolders((value) => ({ ...value, codeRoots }));
        }}
      />
      <Form.FilePicker
        id="excluded"
        title="Skip Folders"
        canChooseDirectories
        canChooseFiles={false}
        value={folders.excludedFolders}
        onChange={(excludedFolders) =>
          setFolders((value) => ({ ...value, excludedFolders }))
        }
      />
    </Form>
  );
}
