import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  getSelectedText,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { randomUUID } from "crypto";
import { pathToFileURL } from "url";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Capture,
  EngineError,
  Status,
  UNAVAILABLE_REASONS,
  UnavailableReason,
  getStatus,
  readClipboard,
  recognizeText,
  translate,
} from "./engine";
import { Entry, Source, discardImage, useHistory } from "./history";
import { LANGUAGES, languageName } from "./languages";

interface TranslatorProps {
  /** Where the text to translate comes from when the command opens. */
  source: Source;
  /** Text to translate straight away (fallback command, launch context). */
  text?: string;
  /** A screenshot to read the text from. */
  image?: string;
}

/** A translation that is still being written. */
interface Job {
  original: string;
  translation: string;
  from?: string;
  to: string;
  source: Source;
  image?: string;
  /** Translated, but the history could not save it; the result stays on screen to copy. */
  unsaved?: boolean;
}

/** Why there is nothing to translate, shown in place of the empty list. */
interface Notice {
  icon: Icon | { source: Icon; tintColor: Color };
  title: string;
  description: string;
  /** Offer to read the source again. */
  retry?: boolean;
}

const JOB_ID = "job";
const APPLE_INTELLIGENCE_SETTINGS = "x-apple.systempreferences:com.apple.Siri-Settings.extension";

const UNAVAILABLE: Record<UnavailableReason, { title: string; description: string }> = {
  notEnabled: {
    title: "Apple Intelligence Is Turned Off",
    description: "Turn it on in System Settings, then come back to translate.",
  },
  notReady: {
    title: "Apple Intelligence Is Getting Ready",
    description: "The on-device model is still downloading. Try again in a few minutes.",
  },
  notEligible: {
    title: "This Mac Can’t Run Apple Intelligence",
    description: "Translation needs a Mac with Apple silicon and macOS 26 or later.",
  },
  unknown: {
    title: "Apple Intelligence Isn’t Available",
    description: "Check Apple Intelligence in System Settings, then try again.",
  },
};

const PREPARING: Record<Source, string> = {
  input: "",
  clipboard: "Reading the Clipboard…",
  selection: "Reading the Selection…",
  screenshot: "Reading the Screenshot…",
};

const NOTHING_FOUND: Record<Exclude<Source, "input">, Notice> = {
  clipboard: {
    icon: Icon.Clipboard,
    title: "The Clipboard Is Empty",
    description: "Copy some text or an image with text in it, then run this command again.",
  },
  selection: {
    icon: Icon.TextSelection,
    title: "No Text Is Selected",
    description: "Select text in any app, then run this command again.",
  },
  screenshot: {
    icon: Icon.Image,
    title: "No Text Found in the Screenshot",
    description: "Capture an area that contains text, or type it here instead.",
  },
};

const READ_FAILED: Record<"clipboard" | "screenshot", string> = {
  clipboard: "Couldn’t Read the Clipboard",
  screenshot: "Couldn’t Read the Screenshot",
};

const NO_TEXT_IN_IMAGE: Notice = {
  icon: Icon.Image,
  title: "No Text Found in the Image",
  description: "The image on the clipboard has no text that could be read.",
};

function sourceIcon(source: Source, image?: string) {
  if (image) return Icon.Image;
  if (source === "clipboard") return Icon.Clipboard;
  if (source === "selection") return Icon.TextSelection;
  return Icon.Text;
}

const singleLine = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Copied or translated text is shown as Markdown, which can embed remote images. Image syntax and
 * HTML are escaped, and an invisible word joiner splits every "//" so that no URL in the text can
 * be fetched even if the renderer still reads some of it as markup. Copy actions use the raw text.
 */
const inert = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/!\[/g, "!\\[").replace(/</g, "\\<").replace(/\/\//g, "/\u2060/");

/** Markdown folds single line breaks into spaces; keep the lines the text came with. */
const keepLineBreaks = (text: string) => text.replace(/\n/g, "  \n");

/** The translation, then the language pair, the original as a quote and the image it was read from. */
function detailMarkdown(item: { original: string; translation: string; from?: string; to: string; image?: string }) {
  const languages = item.from ? `\`${languageName(item.from)} → ${languageName(item.to)}\`\n\n` : "";
  const quote = inert(item.original)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("  \n");
  const image = item.image ? `\n\n![The image this text was read from](${pathToFileURL(item.image).href})` : "";
  return `${keepLineBreaks(inert(item.translation))}\n\n---\n\n${languages}${quote}${image}`;
}

export function Translator({ source, text: launchText, image: launchImage }: TranslatorProps) {
  const preferences = getPreferenceValues<Preferences>();
  const history = useHistory();

  const [searchText, setSearchText] = useState("");
  const [target, setTarget] = useState<string>(preferences.toLang);
  const [selectedId, setSelectedId] = useState<string>();
  const [job, setJob] = useState<Job>();
  const [isPreparing, setIsPreparing] = useState(source !== "input" || Boolean(launchText));
  const [notice, setNotice] = useState<Notice>();
  const [status, setStatus] = useState<Status>();

  const controller = useRef<AbortController>(undefined);
  const targetRef = useRef(target);
  targetRef.current = target;

  const checkStatus = useCallback(() => {
    getStatus()
      .then(setStatus)
      .catch(() => setStatus({ available: false, reason: "unknown" }));
  }, []);

  /**
   * Translates `original`. Without `into`, the language picked in the search bar is used,
   * falling back to the other preferred language when the text is already in it.
   */
  const run = useCallback(
    async (original: string, origin: { source: Source; image?: string }, into?: string) => {
      const to = into ?? targetRef.current;
      const alt = into ? undefined : to === preferences.altLang ? preferences.toLang : preferences.altLang;

      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      // Only the newest translation that has not been stopped may touch the view. Once saved,
      // only being replaced matters: the entry is already in the history.
      const owns = () => controller.current === abort;
      const live = () => owns() && !abort.signal.aborted;
      // Deleting the entry this text came from must not delete the image it still needs.
      const release = history.hold(origin.image);

      setNotice(undefined);
      setSearchText("");
      setJob({ original, translation: "", to, ...origin });
      setSelectedId(JOB_ID);

      try {
        let result;
        try {
          result = await translate(original, {
            to,
            alt,
            signal: abort.signal,
            onStart: (from, to) => live() && setJob((job) => job && { ...job, from, to }),
            onText: (translation) => live() && setJob((job) => job && { ...job, translation }),
          });
        } catch (error) {
          // Replaced by a newer translation, or stopped: the Stop action already reset the view,
          // and the search text may have been edited since.
          if (!live()) return;
          setJob(undefined);
          setSearchText(singleLine(original));
          if (error instanceof EngineError && UNAVAILABLE_REASONS.includes(error.code)) {
            setStatus({ available: false, reason: error.code as UnavailableReason });
          } else {
            await showFailureToast(error, { title: "Couldn’t Translate" });
          }
          return;
        }
        if (!live()) return;

        const entry: Entry = {
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          original,
          translation: result.text,
          from: result.from,
          to: result.to,
          ...origin,
        };
        try {
          await history.add(entry);
        } catch (error) {
          if (!owns()) return;
          setJob({ ...entry, unsaved: true });
          await showFailureToast(error, { title: "Couldn’t Save the Translation" });
          return;
        }
        if (!owns()) return;
        setJob(undefined);
        setSelectedId(entry.id);

        if (preferences.autoCopy) {
          await Clipboard.copy(result.text);
          await showToast({ style: Toast.Style.Success, title: "Copied Translation" });
        }
      } finally {
        release();
      }
    },
    [history.add, history.hold, preferences.altLang, preferences.toLang, preferences.autoCopy],
  );

  /** Reads what the command was opened for and translates it. */
  const load = useCallback(async () => {
    setIsPreparing(true);
    setNotice(undefined);
    let capture: Capture = { kind: "empty" };
    try {
      if (launchImage) capture = await recognizeText(launchImage);
      else if (launchText) capture = { kind: "text", text: launchText };
      else if (source === "clipboard") capture = await readClipboard();
      else if (source === "selection") {
        // Raycast throws when nothing is selected; that is the "nothing selected" case.
        capture = { kind: "text", text: await getSelectedText().catch(() => "") };
      } else return;
    } catch (error) {
      if (source === "clipboard" || source === "screenshot") {
        setNotice({
          icon: { source: Icon.Warning, tintColor: Color.Orange },
          title: READ_FAILED[source],
          description: error instanceof Error ? error.message : String(error),
          retry: true,
        });
      }
      return;
    } finally {
      setIsPreparing(false);
    }

    const text = capture.text?.trim();
    if (text) {
      await run(text, { source, image: capture.image });
    } else if (source !== "input") {
      await discardImage(capture.image ?? launchImage);
      setNotice(source === "clipboard" && capture.kind === "image" ? NO_TEXT_IN_IMAGE : NOTHING_FOUND[source]);
    }
  }, [launchImage, launchText, source, run]);

  // Pick up what the command was opened for.
  useEffect(() => {
    checkStatus();
    void load();
    return () => controller.current?.abort();
  }, []);

  const typed = searchText.trim();
  const translateTyped = typed ? (
    <Action title="Translate" icon={Icon.Globe} onAction={() => run(typed, { source: "input" })} />
  ) : null;

  if (status && !status.available) {
    const reason = status.reason ?? "unknown";
    return (
      <List searchBarPlaceholder="Text to translate">
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title={UNAVAILABLE[reason].title}
          description={UNAVAILABLE[reason].description}
          actions={
            <ActionPanel>
              {reason !== "notEligible" && (
                <Action.Open title="Open System Settings" icon={Icon.Gear} target={APPLE_INTELLIGENCE_SETTINGS} />
              )}
              <Action title="Check Again" icon={Icon.ArrowClockwise} onAction={checkStatus} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const entries = history.entries ?? [];
  const hasItems = Boolean(job) || entries.length > 0;

  const historyFailed: Notice | undefined =
    history.error && !history.entries
      ? {
          icon: { source: Icon.Warning, tintColor: Color.Orange },
          title: "Couldn’t Load the History",
          description: history.error.message,
          retry: true,
        }
      : undefined;

  const empty: Notice =
    isPreparing && source !== "input"
      ? { icon: sourceIcon(source, launchImage), title: PREPARING[source], description: "" }
      : (notice ??
        historyFailed ?? {
          icon: Icon.Globe,
          title: "Type Text and Press Return",
          description: "Apple Intelligence translates it on this Mac. Nothing is sent anywhere.",
        });

  return (
    <List
      isLoading={isPreparing || Boolean(job && !job.unsaved) || history.isLoading}
      isShowingDetail={hasItems}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Text to translate"
      selectedItemId={selectedId}
      searchBarAccessory={
        <List.Dropdown tooltip="Translate into" value={target} onChange={setTarget}>
          <List.Dropdown.Section title="Translate into">
            {LANGUAGES.map((language) => (
              <List.Dropdown.Item key={language.code} value={language.code} title={language.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={<ActionPanel>{translateTyped}</ActionPanel>}
    >
      <List.EmptyView
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        actions={
          empty.retry ? (
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={notice ? load : () => history.revalidate()}
              />
            </ActionPanel>
          ) : undefined
        }
      />

      {job && (
        <List.Item
          id={JOB_ID}
          icon={sourceIcon(job.source, job.image)}
          title={singleLine(job.original)}
          detail={
            <List.Item.Detail markdown={detailMarkdown({ ...job, translation: job.translation || "_Translating…_" })} />
          }
          actions={
            job.unsaved ? (
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Translation" content={job.translation} />
                <Action.Paste title="Paste Translation" content={job.translation} />
              </ActionPanel>
            ) : (
              <ActionPanel>
                <Action
                  title="Stop Translating"
                  icon={Icon.Stop}
                  onAction={() => {
                    // The piece being translated finishes in the background; the view stops now.
                    controller.current?.abort();
                    setJob(undefined);
                    setSearchText(singleLine(job.original));
                  }}
                />
              </ActionPanel>
            )
          }
        />
      )}

      {entries.map((entry) => (
        <List.Item
          id={entry.id}
          key={entry.id}
          icon={sourceIcon(entry.source, entry.image)}
          title={singleLine(entry.original)}
          detail={<List.Item.Detail markdown={detailMarkdown(entry)} />}
          actions={
            <ActionPanel>
              {translateTyped}
              <Action.CopyToClipboard title="Copy Translation" content={entry.translation} />
              <Action.Paste title="Paste Translation" content={entry.translation} />
              <Action.CopyToClipboard
                title="Copy Original"
                content={entry.original}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <ActionPanel.Section>
                <ActionPanel.Submenu
                  title="Translate into…"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                >
                  {LANGUAGES.filter((language) => language.code !== entry.to).map((language) => (
                    <Action
                      key={language.code}
                      title={language.name}
                      onAction={() => run(entry.original, { source: entry.source, image: entry.image }, language.code)}
                    />
                  ))}
                </ActionPanel.Submenu>
                <Action
                  title="Edit Original"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() => setSearchText(singleLine(entry.original))}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete this translation?",
                      message: "It will be removed from the history. This can’t be undone.",
                      primaryAction: { title: "Delete Entry", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    try {
                      await history.remove(entry.id);
                    } catch (error) {
                      await showFailureToast(error, { title: "Couldn’t Delete the Entry" });
                    }
                  }}
                />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Clear the translation history?",
                      message: `All ${entries.length} entries will be deleted. This can’t be undone.`,
                      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    try {
                      await history.clear();
                    } catch (error) {
                      await showFailureToast(error, { title: "Couldn’t Clear the History" });
                    }
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
