import { Link } from "@/types";
import { getLinkMarkdown } from "@/utils/content";
import { writeCachedMarkdown } from "@/utils/markdown-cache";
import { useEffect } from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";

type Props = {
  link: Link;
  onVisit: (link: Link) => void;
};

export default function LinkContent({ link, onVisit }: Props) {
  const { data, isLoading, error } = useCachedPromise(getLinkMarkdown, [link.url.markdown], {
    // Suppress the hook's default failure toast — we decide below whether cached markdown
    // makes the error view (no toast) or the cached page (toast) the right surface.
    onError: () => {},
    // Only a confirmed fetch refreshes the shared copy and its age. useCachedPromise hands back
    // a restored value immediately while it revalidates in the background; writing that would
    // reset the age without anything having been fetched, so a page whose refresh never
    // succeeded would keep reading as fresh and never be re-fetched by the list's copy action.
    onData: (markdown) => writeCachedMarkdown(link.url.markdown, markdown),
  });

  // Fires once per distinct `error` reference, never on a re-render where `error` is unchanged,
  // so it can't double-fire for one failure. `data` is read from this render's closure rather
  // than listed as a dependency, so it reflects whatever was current when this error appeared.
  useEffect(() => {
    if (error && data) {
      showFailureToast(error, { title: "Failed to Refresh Content" });
    }
  }, [error]);

  const markdown = data ?? (error ? `# Error\n\nFailed to load content: ${error.message}` : "**Loading...**");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={link.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={error ? "Try Open in Browser" : "Open in Browser"}
            url={link.url.path}
            onOpen={() => onVisit(link)}
          />
          <Action.CopyToClipboard
            title="Copy URL to Clipboard"
            content={link.url.path}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Markdown URL"
            icon={Icon.Link}
            content={link.url.markdown}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
          {data ? (
            <Action.CopyToClipboard
              title="Copy as Markdown"
              icon={Icon.Document}
              content={data}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "m" },
                Windows: { modifiers: ["ctrl", "shift"], key: "m" },
              }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
