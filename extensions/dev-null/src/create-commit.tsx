import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { failToast, showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  environment,
  Form,
  getPreferenceValues,
  getSelectedText,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { bodyCharacterCount, bodyError, MAX_BODY_LENGTH } from "./lib/body";
import { saveClipboardImage } from "./lib/clipboard";
import { postCommit } from "./lib/devnull";
import { loadImages, MAX_IMAGES } from "./lib/images";
import { rememberUsername } from "./username";

const limit = MAX_BODY_LENGTH.toLocaleString();
// Image data from the clipboard is saved here as PNG files, so it can be attached like any other image.
const PASTED_DIR = join(environment.supportPath, "pasted");
// ⌘V stays with the message field: Raycast gives an extension no paste event, so an action on ⌘V would take text
// paste away from it.
const ATTACH_FROM_CLIPBOARD: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "v" };

export default function Command() {
  const [draft, setDraft] = useCachedState<string>("draft", "");
  const [imagePaths, setImagePaths] = useCachedState<string[]>("imagePaths", []);
  const [showImagePicker, setShowImagePicker] = useState(imagePaths.length > 0);
  // Only the empty-submit message is state; the rest is derived from the draft, so a restored draft shows it too.
  const [emptyError, setEmptyError] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | undefined>();
  const [isCommitting, setIsCommitting] = useState(false);
  // Set before the first await, so a second ⌘⏎ during image checks can't post the commit twice.
  const committing = useRef(false);
  // One clipboard image at a time: two saves finishing together would each add to the same list and drop the other.
  const attaching = useRef(false);
  // The commit posted from this form, so it stays reachable after the toast is gone.
  const [lastCommitUrl, setLastCommitUrl] = useState<string | undefined>();

  // The latest values, for comparing against what was submitted once the commit settles.
  const latest = useRef({ draft, imagePaths });
  latest.current = { draft, imagePaths };

  const bodyProblem = draft.trim() ? bodyError(draft) : emptyError;

  // With the preference on, the selection goes into the commit: in place of an empty draft, or below one already
  // started, unless the draft already holds it (the command was reopened on the same selection).
  useEffect(() => {
    if (!getPreferenceValues<Preferences.CreateCommit>().useSelectedText) return;
    getSelectedText().then(
      (text) => {
        const selection = text.trim();
        if (!selection) return;
        setDraft((current) =>
          !current.trim() ? selection : current.includes(selection) ? current : `${current.trimEnd()}\n\n${selection}`,
        );
      },
      // Nothing selected, or no app to read it from.
      () => undefined,
    );
  }, []);

  // Checking an image reads it from disk, so it runs after a change rather than during render.
  const imageKey = JSON.stringify(imagePaths);
  useEffect(() => {
    let isCurrent = true;
    setImageError(undefined);
    if (imagePaths.length === 0) return;
    loadImages(imagePaths).then(
      () => isCurrent && setImageError(undefined),
      (error: unknown) => isCurrent && setImageError(error instanceof Error ? error.message : String(error)),
    );
    return () => {
      isCurrent = false;
    };
  }, [imageKey]);

  function removeImages() {
    setImagePaths([]);
    setShowImagePicker(false);
  }

  // A file copied in Finder is attached as it is. Image data, such as a screenshot copied with ⌃⇧⌘4, is saved as a
  // PNG first. Either way the image check runs on it like any picked file.
  async function attachClipboardImage() {
    if (attaching.current) return;
    if (imagePaths.length >= MAX_IMAGES) {
      await showError(new Error(`A commit can carry up to ${MAX_IMAGES} images.`), { title: "Couldn't Attach Image" });
      return;
    }
    attaching.current = true;
    let toast: Toast | undefined;
    try {
      toast = await showToast({ style: Toast.Style.Animated, title: "Attaching image…" });
      const { file } = await Clipboard.read();
      const copied = file?.startsWith("file://") ? fileURLToPath(file) : file;
      const path =
        copied && /\.(jpe?g|png|webp)$/i.test(copied) ? copied : await saveClipboardImage(PASTED_DIR, imagePaths);
      if (!path) {
        failToast(toast, new Error("Copy an image or an image file first."), {
          title: "No Image on the Clipboard",
        });
        return;
      }
      // Checked again against the images as they are now: more may have been picked while this one was saved.
      const current = latest.current.imagePaths;
      if (!current.includes(path) && current.length >= MAX_IMAGES) {
        failToast(toast, new Error(`A commit can carry up to ${MAX_IMAGES} images.`), {
          title: "Couldn't Attach Image",
        });
        return;
      }
      if (!current.includes(path)) setImagePaths([...current, path]);
      setShowImagePicker(true);
      toast.style = Toast.Style.Success;
      toast.title = "Image attached";
    } catch (error) {
      logger.error("Attach image from clipboard failed", error);
      const options = { title: "Couldn't Attach Image" };
      if (toast) failToast(toast, error, options);
      else await showError(error, options);
    } finally {
      attaching.current = false;
    }
  }

  async function handleSubmit() {
    if (committing.current) return;
    if (!draft.trim()) {
      setEmptyError("Write something to commit");
      return;
    }
    if (bodyError(draft)) return;

    const submitted = { draft, imagePaths };
    const submittedKey = JSON.stringify(imagePaths);
    committing.current = true;
    setIsCommitting(true);
    let toast: Toast | undefined;
    try {
      // Re-read the images rather than trust the last check: the user may have fixed a file in place.
      if (imagePaths.length > 0) {
        try {
          await loadImages(imagePaths);
        } catch (error) {
          // Only for the images that were checked; the user may have picked others meanwhile.
          if (JSON.stringify(latest.current.imagePaths) === submittedKey) {
            setImageError(error instanceof Error ? error.message : String(error));
          }
          return;
        }
      }
      toast = await showToast({
        style: Toast.Style.Animated,
        title: imagePaths.length > 0 ? "Signing and uploading…" : "Signing and committing…",
      });
      const result = await postCommit(
        { message: submitted.draft, imagePaths: submitted.imagePaths },
        { log: (message, data) => logger.log(message, data) },
      );
      logger.log("Commit posted", result);
      await rememberUsername(result.url);
      // The form stays open so the toast, and its link to the new commit, stay on screen.
      // Whatever the user changed while it posted is kept.
      if (latest.current.draft === submitted.draft) setDraft("");
      if (JSON.stringify(latest.current.imagePaths) === submittedKey) removeImages();
      toast.style = Toast.Style.Success;
      toast.title = result.pending ? "Committed, pending review" : "Committed to /dev/null";
      toast.message = result.pending ? "Only you can see it until it's approved" : undefined;
      const { url } = result;
      setLastCommitUrl(url);
      if (url) toast.primaryAction = { title: "Open Commit", onAction: () => open(url) };
    } catch (error) {
      logger.error("Commit failed", error);
      // A request timeout is a failure here, not a superseded request to stay quiet about.
      const options = { title: "Couldn't Commit", ignoreAbort: false };
      if (toast) failToast(toast, error, options);
      else await showError(error, options);
    } finally {
      committing.current = false;
      setIsCommitting(false);
    }
  }

  return (
    <Form
      isLoading={isCommitting}
      navigationTitle={`${bodyCharacterCount(draft).toLocaleString()} of ${limit}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Commit" onSubmit={handleSubmit} />
          {showImagePicker ? (
            <Action
              icon={Icon.Trash}
              title="Remove Images"
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={removeImages}
            />
          ) : (
            <Action
              icon={Icon.Paperclip}
              title="Attach Image…"
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => setShowImagePicker(true)}
            />
          )}
          <Action
            icon={Icon.Clipboard}
            title="Attach Image from Clipboard"
            shortcut={ATTACH_FROM_CLIPBOARD}
            onAction={attachClipboardImage}
          />
          {lastCommitUrl && (
            <Action.OpenInBrowser title="Open Commit" url={lastCommitUrl} shortcut={Keyboard.Shortcut.Common.Open} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Commit Message"
        placeholder="What did you ship today?"
        value={draft}
        error={bodyProblem}
        onChange={(text) => {
          setDraft(text);
          setEmptyError(undefined);
        }}
      />
      {showImagePicker && (
        <Form.FilePicker
          id="images"
          title="Images"
          info={`Up to ${MAX_IMAGES} JPEG, PNG or WebP images, 10 MB and 6,000 pixels on a side at most`}
          allowMultipleSelection
          canChooseDirectories={false}
          value={imagePaths}
          error={imageError}
          onChange={setImagePaths}
        />
      )}
    </Form>
  );
}
