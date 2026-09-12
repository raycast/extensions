import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";

/**
 * The two artifact galleries on claude.ai.
 *
 * `/code/artifacts` holds artifacts published from Claude Code; `/artifacts`
 * holds those made in the chat app. They are separate galleries, and this
 * extension's index can only ever mirror the first — and only from machines
 * where the hook is installed.
 *
 * So these are the escape hatch. When the artifact you want was published from
 * the web app, or from Claude Code on another machine, it is legitimately absent
 * from the list and no amount of searching will surface it. Going to the source
 * is the correct next move, which is why this section renders in every state
 * INCLUDING the empty ones — where it is the only useful action on screen.
 *
 * **"View", not "Open".** Raycast reserves "Open" for things it opens in-line or
 * hands to an app, and uses "View" for navigating out to a web page — see the
 * Store's own panel (`View Developer`, `View README`, `View Source Code`)
 * alongside its separate `Open in Browser`. These leave Raycast for the browser,
 * so they are View actions. Titles name the destination in full rather than
 * abbreviating to "Gallery": the two products are "Claude" and "Claude Code",
 * and the shortened forms made them look like two views of one thing.
 */
export function GalleryActionSection() {
  return (
    <ActionPanel.Section title="Remote Artifacts">
      <Action.OpenInBrowser
        title="View Claude Code Artifacts"
        icon={Icon.Globe}
        url="https://claude.ai/code/artifacts"
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action.OpenInBrowser
        title="View Claude Artifacts"
        icon={Icon.Globe}
        url="https://claude.ai/artifacts"
        // No `Common` member covers "the other gallery". Plain object because
        // `platforms` is macOS-only — a `{ macOS, Windows }` pair would imply a
        // portability this extension does not have.
        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
      />
    </ActionPanel.Section>
  );
}
