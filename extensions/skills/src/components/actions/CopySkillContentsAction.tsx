import { Action, Clipboard, Icon, Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface CopySkillContentsActionProps {
  /**
   * Full SKILL.md content. When provided, the action copies it instantly.
   * Used by views that already have the content loaded (e.g. the detail view).
   */
  content?: string;
  /**
   * Loader used to fetch the content on demand when it is not already loaded
   * (e.g. list items). Should resolve to the full SKILL.md content, or
   * `undefined` if no content could be found.
   */
  loadContent?: () => Promise<string | undefined>;
}

/**
 * Copies the full SKILL.md content (frontmatter + body) to the clipboard so it
 * can be pasted into other tools such as ChatGPT or Claude without installing
 * the skill. Copies instantly when `content` is preloaded; otherwise fetches it
 * on demand via `loadContent` while showing progress and failure toasts.
 *
 * Both paths mirror the native copy behaviour: the main window is closed and a
 * HUD is shown once the content lands on the clipboard, matching the
 * "copy, then paste elsewhere" flow this action exists for.
 */
export function CopySkillContentsAction({ content, loadContent }: CopySkillContentsActionProps) {
  if (content) {
    return (
      <Action.CopyToClipboard
        title="Copy Skill Contents"
        content={content}
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    );
  }

  if (!loadContent) return null;

  const load = loadContent;

  async function handleCopy() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching Skill Contents…" });
    try {
      const fetched = await load();
      if (!fetched?.trim()) {
        toast.style = Toast.Style.Failure;
        toast.title = "No Skill Contents Found";
        return;
      }
      await Clipboard.copy(fetched);
      await showHUD("Copied Skill Contents to Clipboard");
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Failed to Copy Skill Contents" });
    }
  }

  return (
    <Action
      title="Copy Skill Contents"
      icon={Icon.CopyClipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={handleCopy}
    />
  );
}
