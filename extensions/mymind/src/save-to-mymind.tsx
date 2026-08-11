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
import { useEffect, useMemo, useState } from "react";
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

/** Only the fields still read from the submitted form; title, URL and body are controlled state. */
type SaveValues = {
  kind: "url" | "note" | "file";
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

type InitialState = {
  kind: SaveValues["kind"];
  content: string;
  files: string[];
  title: string;
  url: string;
};

const EMPTY_INITIAL_STATE: InitialState = {
  kind: "note",
  content: "",
  files: [],
  title: "",
  url: "",
};

function getInitialStateFromInput(input: SaveInput): InitialState | undefined {
  if (input.kind === "files") {
    return { ...EMPTY_INITIAL_STATE, kind: "file", files: input.value };
  }

  if (input.kind === "url") {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: input.value };
  }

  if (input.kind === "note") {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: input.value };
  }

  return undefined;
}

async function getClipboardInitialState(): Promise<InitialState | undefined> {
  for (let offset = 0; offset <= 5; offset++) {
    try {
      const initialState = getInitialStateFromInput(classifyClipboardContent(await Clipboard.read({ offset })));

      if (initialState) {
        return initialState;
      }
    } catch {
      // Continue through the available clipboard history when an item can't be read.
    }
  }

  return undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A single short retry: the first read succeeds when there is a selection, so extra
// attempts mostly add dead time to the common "no selection, just save the page" case.
const SELECTED_TEXT_RETRY_DELAYS_MS = [0, 90];

async function getSelectedTextInitialState(): Promise<InitialState | undefined> {
  for (const retryDelayMs of SELECTED_TEXT_RETRY_DELAYS_MS) {
    if (retryDelayMs > 0) {
      await delay(retryDelayMs);
    }

    try {
      const selected = await getSelectedText();
      return getInitialStateFromInput(classifyTextInput(selected));
    } catch {
      // Accessibility text-selection reads are known to be flaky against web content
      // (e.g. Safari); retry a couple of times before giving up on this layer.
    }
  }

  return undefined;
}

const BROWSER_TABS_RETRY_DELAYS_MS = [0, 150, 350];
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

async function getBrowserInitialState(browser: FrontmostBrowser): Promise<InitialState | undefined> {
  // Independent reads — running them together keeps the command's open latency close to
  // the slower of the two rather than their sum.
  const [activeTabUrlFromScript, selectedTextInitialState] = await Promise.all([
    getActiveTabUrlViaAppleScript(browser),
    getSelectedTextInitialState(),
  ]);

  // A selection is an explicit act, so it wins over whatever page happens to be open.
  if (selectedTextInitialState) {
    return selectedTextInitialState;
  }

  if (activeTabUrlFromScript && isProbablyUrl(activeTabUrlFromScript)) {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: activeTabUrlFromScript };
  }

  // The Browser Extension reports whichever browser it's installed in, which isn't
  // necessarily the frontmost one — trusting it for a scriptable browser surfaces a URL
  // from a completely different app. Only fall back to it when the frontmost browser
  // can't be scripted at all (Firefox), where there's no better option.
  if (browser.flavor) {
    return undefined;
  }

  const activeTabUrl = await getActiveTabUrlViaBrowserExtension();

  if (activeTabUrl) {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: activeTabUrl };
  }

  return undefined;
}

/**
 * Detection runs at most once per command launch.
 *
 * `getSelectedText()` is a global, stateful operation (Raycast reads the selection through
 * the system clipboard), so two concurrent calls interfere: one wins and the other fails,
 * which made results flip between the selection, the tab URL and stale clipboard history.
 * React's development double-mount triggers exactly that, so callers share one promise.
 * Each command launch is a fresh process, so this cache lives exactly as long as it should.
 */
let inFlightInitialState: Promise<InitialState> | undefined;

function resolveInitialStateOnce(fallbackText?: string, launchContext?: SaveLaunchContext): Promise<InitialState> {
  inFlightInitialState ??= resolveInitialState(fallbackText, launchContext);
  return inFlightInitialState;
}

async function resolveInitialState(fallbackText?: string, launchContext?: SaveLaunchContext): Promise<InitialState> {
  const launchContextFiles = classifyFilePaths([
    ...(Array.isArray(launchContext?.files) ? launchContext.files : []),
    ...(launchContext?.file ? [launchContext.file] : []),
  ]);

  if (launchContextFiles.kind === "files") {
    return { ...EMPTY_INITIAL_STATE, kind: "file", files: launchContextFiles.value };
  }

  if (launchContext?.url) {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: launchContext.url };
  }

  if (launchContext?.content) {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: launchContext.content };
  }

  // Opt-in: with the preference off, detection stays exactly as it has always been —
  // clipboard first, then Finder — and the browser is never queried, so macOS never
  // asks for Automation permission.
  const { detectContext } = getPreferenceValues<Preferences>();

  if (detectContext) {
    let frontmostApplication: Awaited<ReturnType<typeof getFrontmostApplication>> | undefined;

    try {
      frontmostApplication = await getFrontmostApplication();
    } catch {
      // Frontmost application couldn't be determined; fall through to app-agnostic detection.
    }

    const frontmostBrowser = frontmostApplication ? resolveFrontmostBrowser(frontmostApplication) : undefined;

    if (frontmostBrowser) {
      const browserInitialState = await getBrowserInitialState(frontmostBrowser);

      if (browserInitialState) {
        return browserInitialState;
      }
    } else {
      const selectedTextInitialState = await getSelectedTextInitialState();

      if (selectedTextInitialState) {
        return selectedTextInitialState;
      }
    }
  }

  const clipboardInitialState = await getClipboardInitialState();

  if (clipboardInitialState) {
    return clipboardInitialState;
  }

  try {
    const finderSelection = await getSelectedFinderItems();
    const selectedFiles = classifyFilePaths(finderSelection.map((item) => item.path));

    if (selectedFiles.kind === "files") {
      return { ...EMPTY_INITIAL_STATE, kind: "file", files: selectedFiles.value };
    }
  } catch {
    // Ignore missing Finder context and fall back to text detection.
  }

  const fallbackInput = classifyTextInput(fallbackText);

  if (fallbackInput.kind === "url") {
    return { ...EMPTY_INITIAL_STATE, kind: "url", url: fallbackInput.value };
  }

  if (fallbackInput.kind === "note") {
    return { ...EMPTY_INITIAL_STATE, kind: "note", content: fallbackInput.value };
  }

  return EMPTY_INITIAL_STATE;
}

export default function SaveToMymindCommand(props: LaunchProps) {
  const { push } = useNavigation();
  const { accessKeyId, accessKeySecret, accessLevel } = getPreferenceValues<Preferences>();
  const accessKeyScope = getAccessKeyScope(accessKeyId, accessKeySecret);
  const launchContext = useMemo(() => (props.launchContext ?? {}) as SaveLaunchContext, [props.launchContext]);
  const [kind, setKind] = useState<SaveValues["kind"]>("note");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      try {
        const nextState = await resolveInitialStateOnce(props.fallbackText, launchContext);

        if (cancelled) {
          return;
        }

        setKind(nextState.kind);
        setSelectedFiles(nextState.files);
        setTitle(nextState.title);
        setContent(nextState.content);
        setUrl(nextState.url);
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [launchContext, props.fallbackText]);

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
    const trimmedContent = content.trim();
    const trimmedUrl = url.trim();
    const spaceId = values.spaceId || undefined;

    if (kind === "url" && !trimmedUrl) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    if (kind === "note" && !trimmedContent) {
      await showToast({ style: Toast.Style.Failure, title: "Note content is required" });
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
              tags: tagNames.length > 0 ? tagNames : undefined,
              spaceId,
            });

            if (spaceId && !result.object.spaces?.some((space) => space.id === spaceId)) {
              await addObjectToSpaces(result.object.id, [spaceId]);
            }

            if (trimmedContent) {
              await createObjectNote(result.object.id, trimmedContent);
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
        </ActionPanel>
      }
    >
      <Form.Dropdown id="kind" title="Type" value={kind} onChange={(value) => setKind(value as SaveValues["kind"])}>
        <Form.Dropdown.Item value="url" title="Link" />
        <Form.Dropdown.Item value="note" title="Note" />
        <Form.Dropdown.Item value="file" title="File" />
      </Form.Dropdown>
      {kind === "note" ? (
        <Form.TextField id="title" title="Title" placeholder="Optional title" value={title} onChange={setTitle} />
      ) : null}
      {kind === "file" ? (
        <>
          <Form.FilePicker
            id="files"
            title="Files"
            value={selectedFiles}
            onChange={setSelectedFiles}
            allowMultipleSelection={true}
          />
          <Form.Description text="Choose one or more supported files. You can remove any file before uploading." />
          {unsupportedSelectedFiles.length > 0 ? (
            <Form.Description
              text={`Unsupported files will be skipped: ${unsupportedSelectedFiles
                .slice(0, 3)
                .map((filePath) => filePath.split(/[\\/]/).pop() ?? filePath)
                .join(", ")}${unsupportedSelectedFiles.length > 3 ? ", …" : ""}`}
            />
          ) : null}
          <Form.TextArea
            id="content"
            title="Note"
            placeholder="Optional note to attach to each uploaded file"
            value={content}
            onChange={setContent}
          />
        </>
      ) : null}
      {kind === "url" ? (
        <>
          <Form.TextField id="url" title="URL" placeholder="https://example.com" value={url} onChange={setUrl} />
          <Form.TextArea id="content" title="Body" placeholder="Optional note" value={content} onChange={setContent} />
        </>
      ) : kind === "note" ? (
        <Form.TextArea
          id="content"
          title="Body"
          placeholder="Write your note here…"
          value={content}
          onChange={setContent}
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
