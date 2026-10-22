import { failToast, showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Form, Icon, Keyboard, open, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { bodyCharacterCount, bodyError, MAX_BODY_LENGTH } from "./lib/body";
import { postCommit } from "./lib/devnull";
import { loadImages, MAX_IMAGES } from "./lib/images";

const limit = MAX_BODY_LENGTH.toLocaleString("en-US");

export default function Command() {
  const [draft, setDraft] = useCachedState<string>("draft", "");
  const [imagePaths, setImagePaths] = useCachedState<string[]>("imagePaths", []);
  const [showAttachments, setShowAttachments] = useState(imagePaths.length > 0);
  // Only the empty-submit message is state; the rest is derived from the draft, so a restored draft shows it too.
  const [emptyError, setEmptyError] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | undefined>();
  const [isCommitting, setIsCommitting] = useState(false);
  // Set before the first await, so a second ⌘⏎ during image checks can't post the commit twice.
  const committing = useRef(false);
  // The commit posted from this form, so it stays reachable after the toast is gone.
  const [lastCommitUrl, setLastCommitUrl] = useState<string | undefined>();

  // The latest values, for comparing against what was submitted once the commit settles.
  const latest = useRef({ draft, imagePaths });
  latest.current = { draft, imagePaths };

  const bodyProblem = draft.trim() ? bodyError(draft) : emptyError;

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

  function removeAttachments() {
    setImagePaths([]);
    setShowAttachments(false);
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
      // The form stays open so the toast, and its link to the new commit, stay on screen.
      // Whatever the user changed while it posted is kept.
      if (latest.current.draft === submitted.draft) setDraft("");
      if (JSON.stringify(latest.current.imagePaths) === submittedKey) removeAttachments();
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
      navigationTitle={`${bodyCharacterCount(draft).toLocaleString("en-US")} of ${limit}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Commit" onSubmit={handleSubmit} />
          {showAttachments ? (
            <Action
              icon={Icon.Trash}
              title="Remove Attachments"
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={removeAttachments}
            />
          ) : (
            <Action
              icon={Icon.Paperclip}
              title="Add Attachment"
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => setShowAttachments(true)}
            />
          )}
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
      {showAttachments && (
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
