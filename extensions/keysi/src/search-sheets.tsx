import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Application,
  Clipboard,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  LocalStorage,
  getFrontmostApplication,
  showToast,
  Toast,
} from "@raycast/api";
import { flatten, loadSheets, matching, USER_SHEETS_DIR, type Sheet, type Shortcut } from "./lib/sheets";
import { builtinSheetDirs } from "./lib/prefs";
import { parse, rank, remember, type Recents } from "./lib/recents";
import { readTier } from "./lib/tier";
import { Locked } from "./lib/locked";
import { showShortcuts } from "./lib/keysi";

/** Where the recent list lives. Namespaced so a future key can't collide. */
const RECENTS_KEY = "recent-shortcuts";

/**
 * Search across every cheat sheet — the bundled Vim, tmux, Figma and Slack
 * ones, plus anything the user wrote.
 *
 * Reads the sheet JSON straight off disk rather than asking the app. Those
 * files are the source of truth, they are static, and they are the half of
 * Keysi that does *not* need the Accessibility API — so this command works
 * with Keysi closed, which is the whole reason it is worth having in a
 * launcher. Anything about the frontmost app's live menus goes through the
 * URL scheme instead, because only the app can read those.
 */
export default function Command(props: LaunchProps<{ arguments: Arguments.SearchSheets }>) {
  // Held in state rather than read once, so the "Check Again" action on the
  // locked screen can do something. Everything else about this command is
  // static, but the tier is the one thing that can change while the command
  // is open — buying Pro is exactly what someone does from that screen.
  const [tier, setTier] = useState(() => readTier());

  // Seeded from the argument, or from Raycast's fallback text when this
  // command was launched from the root search with something already typed.
  // Controlled, which means `filtering` has to be asked for explicitly —
  // without it Raycast hands the whole list back unfiltered.
  const [searchText, setSearchText] = useState(props.fallbackText ?? props.arguments?.query ?? "");

  const [frontmost, setFrontmost] = useState<Application | undefined>(undefined);
  const [recents, setRecents] = useState<Recents>({});

  const sheets = useMemo<Sheet[]>(() => (tier.unlocked ? loadSheets(builtinSheetDirs()) : []), [tier.unlocked]);
  const shortcuts = useMemo(() => flatten(sheets), [sheets]);

  useEffect(() => {
    if (!tier.unlocked) return;
    // Both of these are "nice if it arrives" — an ordering hint and a recent
    // list. Neither is worth an error state, and the list renders correctly
    // without either, so they land asynchronously into an already-good view.
    getFrontmostApplication()
      .then(setFrontmost)
      .catch(() => undefined);
    LocalStorage.getItem<string>(RECENTS_KEY)
      .then((raw) => setRecents(parse(raw)))
      .catch(() => undefined);
  }, [tier.unlocked]);

  if (!tier.unlocked) {
    return <Locked status={tier} onRecheck={() => setTier(readTier())} />;
  }

  if (shortcuts.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No cheat sheets found"
          description="Keysi ships sheets for Vim, tmux, Figma and Slack. If it's installed somewhere other than Applications, point this extension at it in the command's settings."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Keysi.io" url="https://keysi.io" icon={Icon.Globe} />
              <Action.ShowInFinder title="Open Your Sheets Folder" path={USER_SHEETS_DIR} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  /**
   * Records a row as used, immediately and optimistically.
   *
   * Not awaited by the caller: the useful thing — the copy, the panel —
   * already happened, and Raycast usually closes the window right after. A
   * dropped write costs one position in a list.
   */
  async function markUsed(id: string) {
    const next = remember(recents, id);
    setRecents(next);
    try {
      await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      // A recent list that fails to persist is not worth interrupting for.
    }
  }

  const byId = new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut]));

  // Sheets that are about the app the user was just in. Float to the top:
  // "what are Figma's shortcuts" is most often asked from inside Figma.
  const currentAppSheetIds = new Set(matching(sheets, frontmost).map((sheet) => sheet.id));
  const currentAppName = frontmost?.name;

  // Only when nothing has been typed. Once there is a query the user has
  // said what they want, and showing the same row twice — once under
  // "Recently Used", once under its sheet — makes the results read as
  // duplicated rather than as helpful.
  const recentIds = searchText.trim().length === 0 ? rank(recents, new Set(byId.keys())) : [];

  const bySheet = new Map<string, Shortcut[]>();
  for (const shortcut of shortcuts) {
    const existing = bySheet.get(shortcut.sheetId);
    if (existing) existing.push(shortcut);
    else bySheet.set(shortcut.sheetId, [shortcut]);
  }
  const sheetIds = [...bySheet.keys()].sort((a, b) => {
    const byMatch = Number(currentAppSheetIds.has(b)) - Number(currentAppSheetIds.has(a));
    if (byMatch !== 0) return byMatch;
    return (bySheet.get(a)?.[0]?.sheetName ?? "").localeCompare(bySheet.get(b)?.[0]?.sheetName ?? "");
  });

  function row(shortcut: Shortcut, keyPrefix = "") {
    return (
      <List.Item
        key={`${keyPrefix}${shortcut.id}`}
        id={`${keyPrefix}${shortcut.id}`}
        title={shortcut.title}
        subtitle={keyPrefix ? shortcut.sheetName : shortcut.group}
        // The keys are the answer, so they get the accessory rather
        // than being buried in a detail pane nobody opens.
        accessories={shortcut.keys ? [{ tag: shortcut.keys }] : []}
        // Raycast only matches on title by default; without this,
        // searching "tmux" or the group name finds nothing.
        keywords={[shortcut.sheetName, shortcut.group, ...shortcut.title.split(/\s+/)]}
        actions={
          <ActionPanel>
            {shortcut.keys ? (
              <Action
                title="Copy Keys"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(shortcut.keys);
                  void markUsed(shortcut.id);
                  await showToast({ style: Toast.Style.Success, title: `Copied ${shortcut.keys}` });
                }}
              />
            ) : null}
            <Action
              title="Open in Keysi"
              icon={Icon.AppWindow}
              onAction={() => {
                void markUsed(shortcut.id);
                showShortcuts(shortcut.title);
              }}
            />
            <Action.CopyToClipboard
              title="Copy Command Name"
              content={shortcut.title}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown"
              // The shape a note or a team wiki wants, so the answer to
              // "what's the shortcut for X" can be pasted somewhere it will
              // still be readable tomorrow.
              content={`- **${shortcut.title}**${shortcut.keys ? ` — \`${shortcut.keys}\`` : ""} (${shortcut.sheetName})`}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {shortcut.sourcePath ? (
              <Action.ShowInFinder
                title="Show Sheet File in Finder"
                path={shortcut.sourcePath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
      searchBarPlaceholder="Search every cheat sheet…"
    >
      {recentIds.length > 0 ? (
        <List.Section title="Recently Used">
          {recentIds.map((id) => row(byId.get(id) as Shortcut, "recent:"))}
        </List.Section>
      ) : null}
      {sheetIds.map((sheetId) => {
        const rows = bySheet.get(sheetId) ?? [];
        const isCurrentApp = currentAppSheetIds.has(sheetId);
        return (
          <List.Section
            key={sheetId}
            title={rows[0]?.sheetName ?? sheetId}
            // Says why this section is first, rather than leaving the order
            // looking arbitrary.
            subtitle={
              isCurrentApp && currentAppName ? `${rows.length} · you're in ${currentAppName}` : `${rows.length}`
            }
          >
            {rows.map((shortcut) => row(shortcut))}
          </List.Section>
        );
      })}
    </List>
  );
}
