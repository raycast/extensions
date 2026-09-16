import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { APP_WEBSITE_URL, openInApp, OpenResult, withInput } from "./shared/links";
import { categorySortIndex, iconFor, ToolEntry, tools } from "./shared/tools";

const PINNED_TOOLS_KEY = "pinned-tools";

/**
 * Show a toast for a deep link launch. If the launch failed, offer a link to
 * the DevT Pro website so the user can install the app.
 */
async function notifyLaunchResult(result: OpenResult, successTitle: string, successMessage?: string) {
  if (result.ok) {
    await showToast({ title: successTitle, message: successMessage, style: Toast.Style.Success });
    return;
  }
  if (result.reason === "not-installed") {
    await showToast({
      title: "DevT Pro Not Installed",
      message: "Install the app and open it once",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Open Website",
        onAction: () => open(APP_WEBSITE_URL),
      },
    });
    return;
  }
  await showToast({
    title: "Could Not Open DevT Pro",
    message: "Make sure the app is installed and has been opened once",
    style: Toast.Style.Failure,
  });
}

/**
 * A form to collect input for a tool before opening the app.
 */
function ToolInputForm({ tool, initialInput = "" }: { tool: ToolEntry; initialInput?: string }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={tool.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Tool"
            icon={Icon.ArrowRight}
            onSubmit={async (values: { input: string }) => {
              const result = await openInApp(withInput(tool.deepLink, values.input ?? ""));
              await notifyLaunchResult(result, `Opened ${tool.name}`);
              if (result.ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Provide input for ${tool.name}`} />
      <Form.TextArea id="input" title="Input" placeholder="Enter text here" defaultValue={initialInput} autoFocus />
    </Form>
  );
}

/**
 * Group tools by category, with pinned tools at the very top.
 */
function groupByCategory(toolList: ToolEntry[], pinnedIds: string[]) {
  const groups: Record<string, ToolEntry[]> = {};
  const pinned: ToolEntry[] = [];

  for (const tool of toolList) {
    if (pinnedIds.includes(tool.route)) {
      pinned.push(tool);
    } else {
      if (!groups[tool.category]) groups[tool.category] = [];
      groups[tool.category].push(tool);
    }
  }

  // Sort categories by canonical order, then alphabetically.
  const sortedCategories = Object.keys(groups).sort((a, b) => {
    const ai = categorySortIndex(a);
    const bi = categorySortIndex(b);
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });

  // Sort tools within each category.
  for (const cat of sortedCategories) {
    groups[cat].sort((a, b) => a.name.localeCompare(b.name));
  }
  pinned.sort((a, b) => a.name.localeCompare(b.name));

  return { sortedCategories, groups, pinned };
}

async function readClipboardText(): Promise<string> {
  try {
    return (await Clipboard.readText()) ?? "";
  } catch {
    return "";
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    LocalStorage.getItem<string>(PINNED_TOOLS_KEY)
      .then((val) => {
        if (!val) return;
        try {
          const parsed: unknown = JSON.parse(val);
          if (Array.isArray(parsed)) setPinnedIds(parsed.filter((id): id is string => typeof id === "string"));
        } catch {
          setPinnedIds([]);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const togglePin = async (route: string) => {
    const isPinned = pinnedIds.includes(route);
    const newPins = isPinned ? pinnedIds.filter((id) => id !== route) : [...pinnedIds, route];
    setPinnedIds(newPins);
    await LocalStorage.setItem(PINNED_TOOLS_KEY, JSON.stringify(newPins));
    await showToast({
      title: isPinned ? "Unpinned Tool" : "Pinned Tool",
      style: Toast.Style.Success,
    });
  };

  const handleOpen = async (tool: ToolEntry) => {
    if (!tool.supportsInput) {
      const result = await openInApp(tool.deepLink);
      await notifyLaunchResult(result, `Opened ${tool.name}`);
      return;
    }

    const clipboard = await readClipboardText();
    if (clipboard.trim().length > 0) {
      const result = await openInApp(withInput(tool.deepLink, clipboard));
      await notifyLaunchResult(result, `Opened ${tool.name}`, "Used clipboard content");
    } else {
      push(<ToolInputForm tool={tool} />);
    }
  };

  // Filter by name/category/description/keywords when the user types.
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [searchText]);

  const { sortedCategories, groups, pinned } = useMemo(
    () => groupByCategory(filtered, pinnedIds),
    [filtered, pinnedIds],
  );

  const renderItem = (tool: ToolEntry, isPinned: boolean) => (
    <List.Item
      key={tool.route}
      title={tool.name}
      subtitle={tool.description}
      icon={iconFor(tool)}
      accessories={isPinned ? [{ icon: { source: Icon.Pin, tintColor: Color.Yellow }, tooltip: "Pinned" }] : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open Tool" icon={Icon.ArrowRight} onAction={() => handleOpen(tool)} />
            {tool.supportsInput && (
              <Action
                title="Open Tool with Input"
                icon={Icon.TextInput}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onAction={async () => push(<ToolInputForm tool={tool} initialInput={await readClipboardText()} />)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isPinned ? "Unpin Tool" : "Pin Tool"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => togglePin(tool.route)}
            />
            <Action.CopyToClipboard
              title="Copy Deep Link"
              content={tool.deepLink}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${tools.length} developer tools`}
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="No Matching Tools" description="Try a different search term" />
      {pinned.length > 0 && <List.Section title="Pinned">{pinned.map((tool) => renderItem(tool, true))}</List.Section>}
      {sortedCategories.map((category) => (
        <List.Section key={category} title={category}>
          {groups[category].map((tool) => renderItem(tool, false))}
        </List.Section>
      ))}
    </List>
  );
}
