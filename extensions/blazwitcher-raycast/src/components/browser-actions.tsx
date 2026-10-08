import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Toast,
  closeMainWindow,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import {
  executeResultAction,
  resultActions,
  type CapturedContext,
  type ResultActionKind,
} from "../actions";
import { describeError, navigateTo, openCapturedUrl } from "../browser/chrome";
import type { useShortcuts } from "../hooks/use-shortcuts";
import { raycastShortcut } from "../shortcuts";
import { sourceNames, type BrowserEntry, type Scope } from "../types";
import { ShortcutSettings } from "./shortcut-settings";

const icons: Record<ResultActionKind, Icon> = {
  open: Icon.ArrowRight,
  newTab: Icon.Plus,
  here: Icon.ArrowRightCircle,
  copy: Icon.Clipboard,
};
const scopes: Scope[] = ["all", "tab", "bookmark", "history"];

export function BrowserActions({
  entry,
  resolve,
  captured,
  shortcuts,
  scope,
  selectScope,
  children,
}: {
  entry?: BrowserEntry;
  resolve: () => BrowserEntry;
  captured: CapturedContext;
  shortcuts: ReturnType<typeof useShortcuts>;
  scope: Scope;
  selectScope: (scope: Scope) => void;
  children?: ActionPanel.Section.Props["children"];
}) {
  const execute = async (kind: ResultActionKind) => {
    try {
      await executeResultAction(kind, resolve, captured, {
        open: navigateTo,
        openUrl: openCapturedUrl,
        copy: (url) => Clipboard.copy(url),
      });
      if (kind === "copy")
        await showToast({ style: Toast.Style.Success, title: "已复制地址" });
      else await closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: kind === "copy" ? "复制失败" : "打开失败",
        message:
          error instanceof Error && error.message.includes("结果已更新")
            ? error.message
            : describeError(error),
      });
    }
  };
  return (
    <ActionPanel>
      {entry && (
        <ActionPanel.Section>
          {resultActions(entry.source).map((action) => (
            <Action
              key={action.id}
              title={action.title}
              icon={icons[action.kind]}
              shortcut={raycastShortcut(shortcuts.bindings[action.id])}
              onAction={() => execute(action.kind)}
            />
          ))}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="切换搜索来源">
        {scopes.map((target) => (
          <Action
            key={target}
            title={`搜索${target === "all" ? "全部来源" : sourceNames[target]}`}
            icon={scope === target ? Icon.Checkmark : Icon.MagnifyingGlass}
            shortcut={raycastShortcut(shortcuts.bindings[`source.${target}`])}
            onAction={() => selectScope(target)}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {shortcuts.ready && (
          <Action.Push
            title="快捷键设置"
            icon={Icon.Keyboard}
            target={
              <ShortcutSettings
                overrides={shortcuts.overrides}
                error={shortcuts.error}
                onSave={shortcuts.save}
              />
            }
          />
        )}
        {children}
        <Action
          title="扩展设置"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
