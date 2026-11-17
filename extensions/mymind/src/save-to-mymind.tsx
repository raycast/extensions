import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Form,
  getFrontmostApplication,
  getSelectedFinderItems,
  getSelectedText,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { runAppleScript, showFailureToast, useCachedPromise } from "@raycast/utils";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addObjectToSpaces,
  createObject,
  createObjectNote,
  isReadOnlyWriteError,
  listSpaces,
  listTags,
  uploadObjectFile,
} from "./api";
import { getAccessKeyScope, useEffectiveAccessLevel, useWriteAccess } from "./access-control";
import { ObjectDetail } from "./components/ObjectActions";
import { getBatchUploadFailureMessage } from "./error-utils";
import { getSpaceIcon } from "./helpers";
import {
  classifyClipboardContent,
  classifyFilePaths,
  classifyTextInput,
  getUnsupportedUploadFiles,
  isProbablyUrl,
  SaveInput,
} from "./save-input";
import {
  getSaveKind,
  getSaveSourceTitle,
  isFinderBundleId,
  joinNoteParts,
  SAVE_SOURCE_PRIORITY,
  SaveSource,
  SaveSourceId,
  shouldReadSelectedText,
  sortSaveSources,
  toDetectedInput,
} from "./save-sources";
import { isUserTag } from "./tag-utils";
import {
  buildActiveTabAppleScript,
  detectFlavorFromScriptingDefinition,
  extractBundleIdFromInfoPlist,
  getBrowserScriptFlavor,
  getScriptingBundleId,
  isKnownBrowserBundleId,
  isSafeBundleId,
  parseActiveTabUrl,
  ScriptableBrowserFlavor,
  supportsAppleScript,
} from "./browser-tabs";

/** Only the fields still read from the submitted form; the text fields are controlled state. */
type SaveValues = {
  existingTags: string[];
  files: string[];
  spaceId: string;
};

type SaveLaunchContext = {
  content?: string;
  file?: string;
  files?: string[];
  url?: string;
};

/** What the form opens with. The kind of save is never stored; it follows from what's filled in. */
type InitialState = {
  input: string;
  files: string[];
};

const EMPTY_INITIAL_STATE: InitialState = { input: "", files: [] };

function getInitialStateFromInput(input: SaveInput): InitialState | undefined {
  if (input.kind === "files") {
    return { input: "", files: input.value };
  }

  if (input.kind === "url" || input.kind === "note") {
    return { input: input.value, files: [] };
  }

  return undefined;
}

/**
 * Input handed over on purpose — from another command, a deeplink, or text typed after the
 * command name in root search. It always wins and never involves detection.
 */
function getExplicitInitialState(fallbackText?: string, launchContext?: SaveLaunchContext): InitialState | undefined {
  const launchContextFiles = classifyFilePaths([
    ...(Array.isArray(launchContext?.files) ? launchContext.files : []),
    ...(launchContext?.file ? [launchContext.file] : []),
  ]);

  if (launchContextFiles.kind === "files") {
    return { input: "", files: launchContextFiles.value };
  }

  if (launchContext?.url) {
    return { input: launchContext.url, files: [] };
  }

  if (launchContext?.content) {
    return { input: launchContext.content, files: [] };
  }

  return getInitialStateFromInput(classifyTextInput(fallbackText));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const BROWSER_TABS_RETRY_DELAYS_MS = [0, 150];
const APPLESCRIPT_TIMEOUT_MS = 3000;

type ScriptingDefinition = {
  content: string;
  /** The bundle that actually owns the terminology, which may be a nested app. */
  bundleId?: string;
};

/**
 * Locates an app's scripting definition. Some browsers (e.g. ChatGPT Atlas) nest the real
 * app — and its `.sdef` — inside `Contents/Support`, in which case the terminology belongs
 * to the nested bundle id rather than the one macOS reports for the frontmost app.
 */
function findScriptingDefinition(appPath: string): ScriptingDefinition | undefined {
  const candidates: Array<{ appDir: string; nested: boolean }> = [{ appDir: appPath, nested: false }];
  const supportDir = join(appPath, "Contents", "Support");

  try {
    for (const entry of readdirSync(supportDir)) {
      if (entry.endsWith(".app")) {
        candidates.push({ appDir: join(supportDir, entry), nested: true });
      }
    }
  } catch {
    // No nested Support bundle.
  }

  for (const { appDir, nested } of candidates) {
    try {
      const resourcesDir = join(appDir, "Contents", "Resources");
      const sdefName = readdirSync(resourcesDir).find((entry) => entry.endsWith(".sdef"));

      if (!sdefName) {
        continue;
      }

      const content = readFileSync(join(resourcesDir, sdefName), "utf8");

      if (!nested) {
        return { content };
      }

      const infoPlist = readFileSync(join(appDir, "Contents", "Info.plist"), "utf8");
      return { content, bundleId: extractBundleIdFromInfoPlist(infoPlist) };
    } catch {
      // Directory missing or unreadable; try the next candidate.
    }
  }

  return undefined;
}

/**
 * Resolves how to script the frontmost browser: allowlist first, then the app's own
 * scripting definition so unlisted browsers keep working without a code change.
 */
function resolveBrowserTarget(
  bundleId: string,
  appPath?: string,
): { bundleId: string; flavor: ScriptableBrowserFlavor } | undefined {
  const knownFlavor = getBrowserScriptFlavor(bundleId);

  if (knownFlavor === "safari" || knownFlavor === "chromium") {
    return { bundleId: getScriptingBundleId(bundleId), flavor: knownFlavor };
  }

  // A recognized-but-unscriptable browser (Firefox); don't probe its bundle.
  if (knownFlavor === "none" || !appPath) {
    return undefined;
  }

  const scriptingDefinition = findScriptingDefinition(appPath);

  if (!scriptingDefinition) {
    return undefined;
  }

  const flavor = detectFlavorFromScriptingDefinition(scriptingDefinition.content);

  if (!flavor) {
    return undefined;
  }

  const scriptingBundleId = scriptingDefinition.bundleId ?? bundleId;
  return isSafeBundleId(scriptingBundleId) ? { bundleId: scriptingBundleId, flavor } : undefined;
}

type FrontmostBrowser = {
  /** The bundle to address in AppleScript; undefined for browsers we can't script. */
  scriptingBundleId?: string;
  /** Undefined for browsers we can't script (Firefox), which use the Browser Extension. */
  flavor?: ScriptableBrowserFlavor;
};

/**
 * Identifies the frontmost app as a browser. Known bundle ids resolve immediately;
 * anything else is accepted only if its scripting definition looks like a browser's,
 * which is what lets newer browsers work without being added to the allowlist.
 */
function resolveFrontmostBrowser(frontmostApplication: {
  bundleId?: string;
  path?: string;
}): FrontmostBrowser | undefined {
  const bundleId = frontmostApplication.bundleId;

  if (!bundleId || !isSafeBundleId(bundleId)) {
    return undefined;
  }

  const target = supportsAppleScript() ? resolveBrowserTarget(bundleId, frontmostApplication.path) : undefined;

  if (target) {
    return { scriptingBundleId: target.bundleId, flavor: target.flavor };
  }

  return isKnownBrowserBundleId(bundleId) ? {} : undefined;
}

async function getActiveTabUrlViaAppleScript(browser: FrontmostBrowser): Promise<string | undefined> {
  const { scriptingBundleId, flavor } = browser;

  if (!scriptingBundleId || !flavor) {
    return undefined;
  }

  try {
    const output = await runAppleScript(buildActiveTabAppleScript(scriptingBundleId, flavor), {
      timeout: APPLESCRIPT_TIMEOUT_MS,
    });

    return parseActiveTabUrl(output);
  } catch {
    // Automation permission denied, browser not scriptable, or no open window.
    return undefined;
  }
}

async function getActiveTabUrlViaBrowserExtension(): Promise<string | undefined> {
  for (const retryDelayMs of BROWSER_TABS_RETRY_DELAYS_MS) {
    if (retryDelayMs > 0) {
      await delay(retryDelayMs);
    }

    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((tab) => tab.active);

      if (activeTab?.url && isProbablyUrl(activeTab.url)) {
        return activeTab.url;
      }

      // If no tab is reported as active (a known Safari/Browser-Extension gap),
      // we deliberately don't guess — reading page content across tabs to work
      // around it would require broader per-site permissions than this feature
      // is worth. Fall through to other detection layers instead.
      return undefined;
    } catch {
      // The native-messaging bridge to the Browser Extension can be transiently
      // unavailable (e.g. right after install, or on a tab opened before it connected);
      // retry a couple of times before giving up.
    }
  }

  return undefined;
}

type FrontmostApplication = Awaited<ReturnType<typeof getFrontmostApplication>>;

async function readClipboardSource(): Promise<SaveSource | undefined> {
  try {
    // Latest item only: walking back through history is how stale prefills used to sneak in.
    const input = toDetectedInput(classifyClipboardContent(await Clipboard.read()));
    return input ? { id: "clipboard", input } : undefined;
  } catch {
    return undefined;
  }
}

async function readSelectionSource(): Promise<SaveSource | undefined> {
  try {
    const input = toDetectedInput(classifyTextInput(await getSelectedText()));
    return input ? { id: "selection", input } : undefined;
  } catch {
    // No selection, or the frontmost app doesn't expose one.
    return undefined;
  }
}

async function readTabSource(application: FrontmostApplication): Promise<SaveSource | undefined> {
  const browser = resolveFrontmostBrowser(application);

  if (!browser) {
    return undefined;
  }

  // The Browser Extension reports whichever browser it's installed in, which isn't
  // necessarily the frontmost one — trusting it for a scriptable browser surfaces a URL
  // from a different app. Only use it when the browser can't be scripted (Firefox, Zen).
  const url = browser.flavor
    ? await getActiveTabUrlViaAppleScript(browser)
    : await getActiveTabUrlViaBrowserExtension();

  if (!url || !isProbablyUrl(url)) {
    return undefined;
  }

  return { id: "tab", input: { kind: "url", value: url }, appName: application.name };
}

async function readFinderSource(): Promise<SaveSource | undefined> {
  try {
    const selection = await getSelectedFinderItems();
    const input = toDetectedInput(classifyFilePaths(selection.map((item) => item.path)));
    return input ? { id: "finder", input } : undefined;
  } catch {
    // Nothing selected in Finder.
    return undefined;
  }
}

type Detection = {
  /** Resolves once every higher-priority source has settled, so a slow read only blocks when it would win. */
  defaultSource: Promise<SaveSource | undefined>;
  /** Every source that found something, in priority order. */
  allSources: Promise<SaveSource[]>;
};

function startDetection(): Detection {
  const frontmostApplication = getFrontmostApplication().catch(() => undefined);
  // Read the clipboard first: `getSelectedText()` can go through the system clipboard, and
  // reading both at once risks picking up the selection as clipboard content.
  const clipboard = readClipboardSource();

  const selection = (async () => {
    const application = await frontmostApplication;
    await clipboard;
    return shouldReadSelectedText(application?.bundleId) ? readSelectionSource() : undefined;
  })();

  const tab = (async () => {
    const application = await frontmostApplication;
    return application ? readTabSource(application) : undefined;
  })();

  const finder = (async () => {
    const application = await frontmostApplication;
    return isFinderBundleId(application?.bundleId) ? readFinderSource() : undefined;
  })();

  const reads: Record<SaveSourceId, Promise<SaveSource | undefined>> = { selection, tab, finder, clipboard };
  const orderedReads = SAVE_SOURCE_PRIORITY.map((id) => reads[id]);

  return {
    defaultSource: (async () => {
      for (const read of orderedReads) {
        const source = await read;

        if (source) {
          return source;
        }
      }

      return undefined;
    })(),
    allSources: Promise.all(orderedReads).then(sortSaveSources),
  };
}

/**
 * Detection runs at most once per command launch.
 *
 * `getSelectedText()` is a global, stateful operation, so two concurrent calls interfere.
 * React's development double-mount triggers exactly that, so callers share one detection.
 * Each command launch is a fresh process, so this lives exactly as long as it should.
 */
let detection: Detection | undefined;

function startDetectionOnce(): Detection {
  detection ??= startDetection();
  return detection;
}

function getSourceShortcut(index: number): Keyboard.Shortcut | undefined {
  if (index > 8) {
    return undefined;
  }

  const key = String(index + 1) as Keyboard.KeyEquivalent;
  return { macOS: { modifiers: ["cmd"], key }, Windows: { modifiers: ["ctrl"], key } };
}

const MANUAL_SOURCE_VALUE = "manual";

export default function SaveToMymindCommand(props: LaunchProps) {
  const { push } = useNavigation();
  const { accessKeyId, accessKeySecret, accessLevel, detectContext } = getPreferenceValues<Preferences>();
  const accessKeyScope = getAccessKeyScope(accessKeyId, accessKeySecret);
  const launchContext = useMemo(() => (props.launchContext ?? {}) as SaveLaunchContext, [props.launchContext]);
  // Explicit input wins outright. Otherwise the form opens empty straight away, and only
  // detects context when the preference asks for it.
  const [initialPlan] = useState(() => {
    const explicitState = getExplicitInitialState(props.fallbackText, launchContext);
    return explicitState
      ? { state: explicitState, detect: false }
      : { state: EMPTY_INITIAL_STATE, detect: Boolean(detectContext) };
  });
  const [input, setInput] = useState(initialPlan.state.input);
  const [selectedFiles, setSelectedFiles] = useState<string[]>(initialPlan.state.files);
  const [title, setTitle] = useState("");
  /** The optional note attached to a link. */
  const [content, setContent] = useState("");
  const kind = getSaveKind(input, selectedFiles);
  const [sources, setSources] = useState<SaveSource[]>([]);
  const [sourceId, setSourceId] = useState<SaveSourceId | typeof MANUAL_SOURCE_VALUE>(MANUAL_SOURCE_VALUE);
  const [isInitializing, setIsInitializing] = useState(initialPlan.detect);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasTypedRef = useRef(false);
  const effectiveAccessLevel = useEffectiveAccessLevel(accessLevel, accessKeyScope);
  const canWrite = useWriteAccess(accessLevel, accessKeyScope);
  const { data: spaces = [], error: spacesError } = useCachedPromise(() => listSpaces(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your spaces" });
    },
  });
  const { data: tags = [], error: tagsError } = useCachedPromise(() => listTags(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your tags" });
    },
  });
  const manualTags = useMemo(
    () =>
      tags
        .filter(isUserTag)
        .map((tag) => tag.name)
        .filter(Boolean),
    [tags],
  );
  const unsupportedSelectedFiles = useMemo(() => getUnsupportedUploadFiles(selectedFiles), [selectedFiles]);

  function applySource(source: SaveSource) {
    const state = getInitialStateFromInput(source.input);

    if (!state) {
      return;
    }

    setSourceId(source.id);
    setSelectedFiles(state.files);
    setInput(state.input);
    setTitle("");
    setContent("");
  }

  function typed<T>(setter: (value: T) => void) {
    return (value: T) => {
      hasTypedRef.current = true;
      setSourceId(MANUAL_SOURCE_VALUE);
      setter(value);
    };
  }

  /** Editing a link into plain text folds its note into the main field instead of hiding it. */
  function handleInputChange(value: string) {
    if (kind === "url" && getSaveKind(value, selectedFiles) === "note" && content.trim()) {
      setInput(joinNoteParts(value, content));
      setContent("");
      return;
    }

    setInput(value);
  }

  /** Adding files folds a link's note into the main field, which becomes the note attached to each file. */
  function handleFilesChange(files: string[]) {
    if (files.length > 0 && selectedFiles.length === 0 && content.trim()) {
      setInput(joinNoteParts(input, content));
      setContent("");
    }

    setSelectedFiles(files);
  }

  useEffect(() => {
    if (!initialPlan.detect) {
      return;
    }

    let cancelled = false;
    const { defaultSource, allSources } = startDetectionOnce();

    void defaultSource
      .then((source) => {
        if (cancelled || !source) {
          return;
        }

        setSources((currentSources) =>
          currentSources.some((candidate) => candidate.id === source.id)
            ? currentSources
            : sortSaveSources([...currentSources, source]),
        );

        // Don't clobber anything typed while detection was still running.
        if (!hasTypedRef.current) {
          applySource(source);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false);
        }
      });

    void allSources.then((detectedSources) => {
      if (!cancelled) {
        setSources(detectedSources);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initialPlan]);

  if (!canWrite) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Open mymind Extensions" url="https://access.mymind.com/extensions" />
            <Action title="Open mymind" icon={Icon.Globe} onAction={() => open("https://access.mymind.com")} />
          </ActionPanel>
        }
      >
        <Form.Description
          text={
            accessLevel === "read-only"
              ? "This extension is set to Read Only. Change Access Level in extension preferences if this key can save and edit."
              : effectiveAccessLevel === "read-only"
                ? "This key appears to be read-only. Use a full-access key, or change Access Level in extension preferences."
                : "Saving is unavailable with the current access setup."
          }
        />
      </Form>
    );
  }

  async function handleSubmit(values: SaveValues) {
    const existingTags = values.existingTags ?? [];
    const files = values.files ?? selectedFiles;
    const tagNames = Array.from(new Set(existingTags));
    const trimmedTitle = title.trim();
    const trimmedInput = input.trim();
    const trimmedUrl = kind === "url" ? trimmedInput : "";
    // A note's body, or the note attached to a link or to each uploaded file.
    const trimmedContent = kind === "url" ? content.trim() : trimmedInput;
    const spaceId = values.spaceId || undefined;

    if (!kind) {
      await showToast({ style: Toast.Style.Failure, title: "Add a link, a note, or files" });
      return;
    }

    if (kind === "file") {
      const supportedFiles = classifyFilePaths(files);

      if (supportedFiles.kind !== "files") {
        await showToast({ style: Toast.Style.Failure, title: "Choose at least one supported file" });
        return;
      }
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to mymind…" });

    try {
      if (kind === "file") {
        const supportedFiles = classifyFilePaths(files);

        if (supportedFiles.kind !== "files") {
          throw new Error("Choose at least one supported file.");
        }

        // One file takes the title; with several, a shared title would be wrong, so it leads the note instead.
        const isSingleFile = supportedFiles.value.length === 1;
        const fileTitle = isSingleFile ? trimmedTitle || undefined : undefined;
        const fileNote = isSingleFile ? trimmedContent : joinNoteParts(trimmedTitle, trimmedContent);
        let createdCount = 0;
        let duplicateCount = 0;
        let failureCount = 0;
        let firstFailureMessage: string | undefined;
        let firstCreatedObjectId: string | undefined;

        for (const [index, filePath] of supportedFiles.value.entries()) {
          toast.message = `${index + 1} of ${supportedFiles.value.length}`;

          try {
            const result = await uploadObjectFile({
              filePath,
              title: fileTitle,
              tags: tagNames.length > 0 ? tagNames : undefined,
              spaceId,
            });

            if (spaceId && !result.object.spaces?.some((space) => space.id === spaceId)) {
              await addObjectToSpaces(result.object.id, [spaceId]);
            }

            if (fileNote) {
              await createObjectNote(result.object.id, fileNote);
            }

            if (result.created) {
              createdCount += 1;
              firstCreatedObjectId ??= result.object.id;
            } else {
              duplicateCount += 1;
            }
          } catch (error) {
            failureCount += 1;
            firstFailureMessage ??= error instanceof Error ? error.message : String(error);
          }
        }

        if (failureCount > 0) {
          toast.style = Toast.Style.Failure;
          toast.title = "Bulk upload finished with errors";
          toast.message = getBatchUploadFailureMessage({
            createdCount,
            duplicateCount,
            failureCount,
            firstFailureMessage,
          });
          return;
        }

        toast.style = Toast.Style.Success;
        toast.title = createdCount === 1 && duplicateCount === 0 ? "Saved to mymind" : "Files saved to mymind";
        toast.message =
          duplicateCount > 0
            ? `${createdCount} uploaded, ${duplicateCount} already existed`
            : `${createdCount} file${createdCount === 1 ? "" : "s"} uploaded`;

        if (supportedFiles.value.length === 1 && firstCreatedObjectId) {
          push(<ObjectDetail objectId={firstCreatedObjectId} pollForTags={true} />, () => {
            void popToRoot();
          });
        }

        return;
      }

      const result = await createObject({
        title: kind === "note" ? trimmedTitle || undefined : undefined,
        url: kind === "url" ? trimmedUrl : undefined,
        content: kind === "note" ? trimmedContent || undefined : undefined,
        tags: tagNames.length > 0 ? tagNames : undefined,
        spaceId,
      });

      let followUpError: string | undefined;

      try {
        if (spaceId && !result.object.spaces?.some((space) => space.id === spaceId)) {
          await addObjectToSpaces(result.object.id, [spaceId]);
        }

        if (kind === "url" && trimmedContent) {
          await createObjectNote(result.object.id, trimmedContent);
        }
      } catch (error) {
        followUpError = error instanceof Error ? error.message : String(error);
      }

      if (followUpError) {
        toast.style = Toast.Style.Failure;
        toast.title = "Saved to mymind, but couldn't finish setup";
        toast.message = followUpError;
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = result.created ? "Saved to mymind" : "Item already existed in mymind";
      toast.message = result.object.title?.trim() || "Untitled";

      if (result.created) {
        push(<ObjectDetail objectId={result.object.id} fallbackObject={result.object} pollForTags={true} />, () => {
          void popToRoot();
        });
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = isReadOnlyWriteError(error) ? "Key is read-only" : "Couldn't save to mymind";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isInitializing || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to mymind" onSubmit={handleSubmit} />
          {sources.length > 1 ? (
            <ActionPanel.Submenu title="Switch Source" icon={Icon.ArrowRightCircle}>
              {sources.map((source, index) => (
                <Action
                  key={source.id}
                  title={getSaveSourceTitle(source)}
                  shortcut={getSourceShortcut(index)}
                  onAction={() => applySource(source)}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
        </ActionPanel>
      }
    >
      {sources.length > 0 ? (
        <Form.Dropdown
          id="source"
          title="From"
          value={sourceId}
          onChange={(value) => {
            const source = sources.find((candidate) => candidate.id === value);

            if (source && value !== sourceId) {
              applySource(source);
            }
          }}
        >
          {sourceId === MANUAL_SOURCE_VALUE ? (
            <Form.Dropdown.Item value={MANUAL_SOURCE_VALUE} title="Typed Manually" />
          ) : null}
          {sources.map((source) => (
            <Form.Dropdown.Item key={source.id} value={source.id} title={getSaveSourceTitle(source)} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextArea
        id="input"
        title={
          kind === "url"
            ? "Link"
            : kind === "file" && selectedFiles.length > 1
              ? "Note for Each File"
              : kind
                ? "Note"
                : "Link or Note"
        }
        placeholder={kind === "file" ? "Optional note to attach" : "Paste a link or write a note"}
        value={input}
        onChange={typed(handleInputChange)}
      />
      {kind === "file" && isProbablyUrl(input.trim().split("\n")[0] ?? "") ? (
        <Form.Description text="With files added, the link is saved as text in each file's note." />
      ) : null}
      {kind === "note" || (kind === "file" && (selectedFiles.length === 1 || title.trim())) ? (
        <Form.TextField id="title" title="Title" placeholder="Optional" value={title} onChange={typed(setTitle)} />
      ) : null}
      {kind === "url" ? (
        <Form.TextArea
          id="content"
          title="Note"
          placeholder="Optional note to attach"
          value={content}
          onChange={typed(setContent)}
        />
      ) : null}
      <Form.FilePicker
        id="files"
        title="Files"
        value={selectedFiles}
        onChange={typed(handleFilesChange)}
        allowMultipleSelection={true}
      />
      {unsupportedSelectedFiles.length > 0 ? (
        <Form.Description
          text={
            "Unsupported files will be skipped: " +
            unsupportedSelectedFiles
              .slice(0, 3)
              .map((filePath) => filePath.split(/[\\/]/).pop() ?? filePath)
              .join(", ") +
            (unsupportedSelectedFiles.length > 3 ? ", …" : "")
          }
        />
      ) : null}
      <Form.Dropdown id="spaceId" title="Space" storeValue={true}>
        <Form.Dropdown.Item value="" title="No Space" />
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={getSpaceIcon(space)} />
        ))}
      </Form.Dropdown>
      {spacesError ? (
        <Form.Description text="Couldn't load your spaces. You can still save without choosing one." />
      ) : null}
      {manualTags.length > 0 ? (
        <Form.TagPicker id="existingTags" title="Tags" placeholder="Select your tags">
          {manualTags.map((tagName) => (
            <Form.TagPicker.Item key={tagName} value={tagName} title={tagName} />
          ))}
        </Form.TagPicker>
      ) : null}
      {tagsError ? <Form.Description text="Couldn't load your tags." /> : null}
    </Form>
  );
}
