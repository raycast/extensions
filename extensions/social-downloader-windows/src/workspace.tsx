import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import {
  expand,
  entryKey,
  resolvePreset,
  runQueue,
  type Entry,
  type Preset,
} from "./batch";
import { convert } from "./conversion";
import { download, executables } from "./downloader";
import type { Tools } from "./tools";
import { validateUrl } from "./media";

interface Job {
  source: string;
  title: string;
  local: boolean;
  playlistItem?: number;
}
interface JobState {
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  progress?: number;
  file?: string;
  error?: string;
}
const names = {
  queued: "Queued",
  running: "Processing",
  done: "Completed",
  failed: "Failed",
  cancelled: "Canceled",
};

function Queue({
  jobs,
  preset,
  destination,
  tools,
  concurrency,
}: {
  jobs: Job[];
  preset: Preset;
  destination: string;
  tools: Tools;
  concurrency: number;
}) {
  const { push } = useNavigation();
  const [states, setStates] = useState<JobState[]>(
    jobs.map(() => ({ status: "queued" })),
  );
  const [busy, setBusy] = useState(true);
  const cancellation = useRef<AbortController | null>(null);
  const individual = useRef(new Map<number, AbortController>());
  const cancelledItems = useRef(new Set<number>());
  const mounted = useRef(true);
  const update = (index: number, value: Partial<JobState>) => {
    if (mounted.current)
      setStates((old) =>
        old.map((state, i) => (i === index ? { ...state, ...value } : state)),
      );
  };
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    cancellation.current = controller;
    void runQueue(
      jobs,
      concurrency,
      controller.signal,
      async (job, index) => {
        if (cancelledItems.current.has(index)) return;
        const own = new AbortController();
        individual.current.set(index, own);
        const signal = AbortSignal.any([controller.signal, own.signal]);
        update(index, { status: "running" });
        try {
          let file: string;
          if (job.local) {
            file = await convert(
              job.source,
              destination,
              {
                format: preset.container,
                height: preset.height,
                bitrate: preset.bitrate,
              },
              tools,
              signal,
              (progress) => update(index, { progress }),
            );
          } else {
            const selection = await resolvePreset(
              job.source,
              tools,
              signal,
              preset,
              job.playlistItem,
            );
            file = await download(
              {
                url: job.source,
                playlistItem: job.playlistItem,
                preserveSourceAudio: preset.mode === "audio" && preset.convert,
                ...selection,
                mode: preset.mode,
                container:
                  preset.convert && preset.mode === "video"
                    ? "mkv"
                    : preset.container,
                filenameTag: randomUUID().slice(0, 8),
                bitrate: preset.bitrate,
                destination,
                ffmpeg: tools.ffmpeg,
              },
              tools,
              signal,
              (event) => {
                if (event.type === "progress")
                  update(index, { progress: event.percent });
              },
            );
            if (preset.convert) {
              update(index, { progress: 0 });
              file = await convert(
                file,
                destination,
                {
                  format: preset.container,
                  height: preset.height,
                  bitrate: preset.bitrate,
                },
                tools,
                signal,
                (progress) => update(index, { progress }),
              );
            }
          }
          update(index, { status: "done", progress: 100, file });
        } catch (error) {
          update(index, {
            status: signal.aborted ? "cancelled" : "failed",
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          individual.current.delete(index);
        }
      },
      (error, index) =>
        update(index, { status: "failed", error: String(error) }),
    ).finally(() => {
      if (mounted.current) {
        setBusy(false);
        setStates((old) =>
          old.map((state) =>
            state.status === "queued"
              ? { ...state, status: "cancelled" }
              : state,
          ),
        );
      }
    });
    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, []);
  const retry = jobs.filter((_, index) =>
    ["failed", "cancelled"].includes(states[index].status),
  );
  return (
    <List
      isLoading={busy}
      isShowingDetail
      navigationTitle="Download Queue"
      searchBarPlaceholder={`Search queue · ${states.filter((s) => s.status === "done").length}/${jobs.length} completed`}
    >
      {jobs.map((job, index) => {
        const state = states[index];
        return (
          <List.Item
            key={index}
            title={job.title}
            icon={
              state.status === "done"
                ? Icon.CheckCircle
                : state.status === "failed"
                  ? Icon.ExclamationMark
                  : Icon.Video
            }
            accessories={[
              {
                text: `${names[state.status]}${state.progress === undefined ? "" : ` · ${state.progress.toFixed(0)}%`}`,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`${names[state.status]}\n\n${state.error || (state.file ? `File ready: ${basename(state.file)}` : "Progress is per stage. Keep this command open until completion.")}`}
              />
            }
            actions={
              <ActionPanel>
                {state.file && (
                  <Action
                    title="Open File"
                    icon={Icon.Play}
                    onAction={() => open(state.file!)}
                  />
                )}
                {state.file && (
                  <Action
                    title="Show in Folder"
                    icon={Icon.Folder}
                    onAction={() => showInFinder(state.file!)}
                  />
                )}
                {["queued", "running"].includes(state.status) && (
                  <Action
                    title="Cancel This Item"
                    icon={Icon.XMarkCircle}
                    onAction={() => {
                      cancelledItems.current.add(index);
                      individual.current.get(index)?.abort();
                      update(index, { status: "cancelled" });
                    }}
                  />
                )}
                {busy && (
                  <Action
                    title="Cancel Entire Queue"
                    icon={Icon.XMarkCircle}
                    onAction={() => cancellation.current?.abort()}
                  />
                )}
                {!busy && retry.length > 0 && (
                  <Action
                    title="Retry Failed and Canceled Items"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      push(
                        <Queue
                          jobs={retry}
                          preset={preset}
                          destination={destination}
                          tools={tools}
                          concurrency={concurrency}
                        />,
                      )
                    }
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export function Workspace({
  tools,
  advanced,
}: {
  tools: Tools;
  advanced: ReactElement;
}) {
  const { push } = useNavigation();
  const settings = getPreferenceValues<Preferences>();
  const [kind, setKind] = useState("download");
  const [links, setLinks] = useState([""]);
  const [files, setFiles] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"video" | "audio">("video");
  const [container, setContainer] = useState<Preset["container"]>("mp4");
  const [height, setHeight] = useState("1080");
  const [bitrate, setBitrate] = useState("192");
  const [recode, setRecode] = useState(false);
  const [parallel, setParallel] = useState("3");
  const [folder, setFolder] = useState([executables(settings).destination]);
  const operation = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
      operation.current?.abort();
    },
    [],
  );
  async function analyze() {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    try {
      const urls = [
        ...new Set(links.map((link) => link.trim()).filter(Boolean)),
      ];
      if (!urls.length) throw new Error("Add at least one link.");
      const found = new Map<string, Entry>();
      const errors: string[] = [];
      for (const url of urls) {
        controller.signal.throwIfAborted();
        try {
          for (const entry of await expand(
            validateUrl(url),
            tools,
            controller.signal,
          ))
            found.set(entryKey(entry), entry);
        } catch (error) {
          if (controller.signal.aborted) throw error;
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
      if (!found.size) throw new Error(errors.join("\n") || "No videos found.");
      if (mounted.current) {
        setEntries([...found.values()]);
        setSelected([...found.keys()]);
        setNotice(
          errors.length
            ? `${errors.length} link(s) failed: ${errors.join("; ")}`
            : "",
        );
      }
    } catch (error) {
      if (mounted.current)
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to Analyze",
          message: controller.signal.aborted
            ? "Operation canceled."
            : String(error),
        });
    } finally {
      operation.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  async function start() {
    const jobs: Job[] =
      kind === "local"
        ? files.map((source) => ({
            source,
            title: basename(source),
            local: true,
          }))
        : (entries ?? [])
            .filter((e) => selected.includes(entryKey(e)))
            .map((e) => ({
              source: e.url,
              title: e.title,
              local: false,
              playlistItem: e.playlistItem,
            }));
    if (!jobs.length || !folder[0]) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select Items and a Destination Folder",
      });
      return;
    }
    push(
      <Queue
        jobs={jobs}
        tools={tools}
        destination={folder[0]}
        preset={{
          mode,
          container,
          height: Number(height),
          bitrate,
          convert: recode,
        }}
        concurrency={kind === "local" ? 1 : Number(parallel)}
      />,
    );
  }
  const ready = kind === "local" || Boolean(entries);
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          {busy ? (
            <Action
              title="Cancel Analysis"
              icon={Icon.XMarkCircle}
              onAction={() => operation.current?.abort()}
            />
          ) : (
            <Action.SubmitForm
              title={
                ready
                  ? kind === "local"
                    ? "Convert Files"
                    : "Start Downloads"
                  : "Analyze Links and Playlists"
              }
              icon={Icon.Download}
              onSubmit={ready ? start : analyze}
            />
          )}
          {!busy && kind === "download" && !entries && (
            <Action
              title="Add Link"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => setLinks((old) => [...old, ""])}
            />
          )}
          {!busy && kind === "download" && !entries && links.length > 1 && (
            <Action
              title="Remove Last Field"
              icon={Icon.XMarkCircle}
              onAction={() => setLinks((old) => old.slice(0, -1))}
            />
          )}
          {!busy && entries && (
            <Action
              title="Edit Links"
              icon={Icon.Pencil}
              onAction={() => {
                setEntries(undefined);
                setNotice("");
              }}
            />
          )}
          {!busy && (
            <Action
              title="Advanced Single Video Quality"
              icon={Icon.Gear}
              onAction={() => push(advanced)}
            />
          )}
          <Action
            title="Configure Download Folder"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      {!busy && (
        <Form.Dropdown
          id="operation"
          title="Operation"
          value={kind}
          onChange={(value) => {
            setKind(value);
            setEntries(undefined);
          }}
        >
          <Form.Dropdown.Item
            value="download"
            title="Download links and playlists"
          />
          <Form.Dropdown.Item value="local" title="Convert local files" />
        </Form.Dropdown>
      )}
      {kind === "download" &&
        !entries &&
        links.map((link, index) => (
          <Fragment key={index}>
            <Form.TextField
              key={index}
              id={`link-${index}`}
              title={`Link ${index + 1}`}
              placeholder="Paste a video or playlist link"
              value={link}
              onChange={(value) =>
                setLinks((old) =>
                  old.map((text, i) => (i === index ? value : text)),
                )
              }
            />
            {index > 0 && (
              <Form.Checkbox
                key={`remove-${links.length}-${index}`}
                id={`remove-link-${index}`}
                title=""
                label={`✕ Remove Link ${index + 1}`}
                value={false}
                onChange={() =>
                  setLinks((old) => old.filter((_, i) => i !== index))
                }
              />
            )}
          </Fragment>
        ))}
      {kind === "download" && !entries && (
        <>
          <Form.Checkbox
            key={`add-${links.length}`}
            id="add-link"
            title=""
            label="＋ Add Link"
            value={false}
            onChange={() => setLinks((old) => [...old, ""])}
          />
          <Form.Description
            title="Platforms"
            text="YouTube, Instagram, X, TikTok, Facebook, Reddit, Vimeo, Twitch, and Pinterest. Preview up to 200 playlist entries per link."
          />
        </>
      )}
      {entries && (
        <Form.TagPicker
          id="entries"
          title={`Videos (${selected.length}/${entries.length})`}
          value={selected}
          onChange={setSelected}
        >
          {entries.map((entry) => (
            <Form.TagPicker.Item
              key={entryKey(entry)}
              value={entryKey(entry)}
              title={entry.title}
              icon={Icon.Video}
            />
          ))}
        </Form.TagPicker>
      )}
      {notice && <Form.Description title="Notice" text={notice} />}
      {kind === "local" && (
        <Form.FilePicker
          id="files"
          title="Files to Convert"
          allowMultipleSelection
          canChooseFiles
          canChooseDirectories={false}
          value={files}
          onChange={setFiles}
        />
      )}
      {ready && (
        <>
          <Form.Dropdown
            id="mode"
            title="Output"
            value={mode}
            onChange={(value) => {
              setMode(value as "video" | "audio");
              setContainer(value === "video" ? "mp4" : "mp3");
            }}
          >
            <Form.Dropdown.Item value="video" title="Video with audio" />
            <Form.Dropdown.Item value="audio" title="Audio only" />
          </Form.Dropdown>
          <Form.Dropdown
            id="format"
            title="Format"
            value={container}
            onChange={(value) => setContainer(value as Preset["container"])}
          >
            {(mode === "video" ? ["mp4", "mkv"] : ["mp3", "m4a"]).map(
              (value) => (
                <Form.Dropdown.Item
                  key={value}
                  value={value}
                  title={value.toUpperCase()}
                />
              ),
            )}
          </Form.Dropdown>
          {mode === "video" && (
            <Form.Dropdown
              id="resolution"
              title="Maximum Resolution"
              value={height}
              onChange={setHeight}
            >
              {["0", "2160", "1440", "1080", "720", "480", "360"].map(
                (value) => (
                  <Form.Dropdown.Item
                    key={value}
                    value={value}
                    title={
                      value === "0" ? "Original / best available" : `${value}p`
                    }
                  />
                ),
              )}
            </Form.Dropdown>
          )}
          <Form.Dropdown
            id="bitrate"
            title="Conversion Audio Bitrate"
            value={bitrate}
            onChange={setBitrate}
          >
            {["128", "192", "256", "320"].map((value) => (
              <Form.Dropdown.Item
                key={value}
                value={value}
                title={`${value} kbps`}
              />
            ))}
          </Form.Dropdown>
          {kind === "download" && (
            <Form.Checkbox
              id="recode"
              label="Convert after download (H.264/AAC video; selected audio bitrate)"
              value={recode}
              onChange={setRecode}
            />
          )}
          {kind === "download" && (
            <Form.Dropdown
              id="parallel"
              title="Simultaneous Downloads"
              value={parallel}
              onChange={setParallel}
            >
              {["1", "2", "3"].map((value) => (
                <Form.Dropdown.Item key={value} value={value} title={value} />
              ))}
            </Form.Dropdown>
          )}
          <Form.FilePicker
            id="folder"
            title="Save To"
            canChooseFiles={false}
            canChooseDirectories
            allowMultipleSelection={false}
            value={folder}
            onChange={setFolder}
          />
          <Form.Description
            title="About Quality"
            text="Uses the best track up to the selected resolution without improving source quality. Conversion creates copies and preserves originals. Closing the command cancels work; partial files may remain."
          />
        </>
      )}
    </Form>
  );
}
