import {
  Action,
  ActionPanel,
  Application,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { BrowserTab, Tab } from "../types/types";
import { isEmpty, isNotEmpty } from "../utils/common-utils";
import { closeBrowserTab, jumpToBrowserTab } from "../utils/applescript-utils";
import { MutatePromise } from "@raycast/utils";

export function ActionTab(props: {
  defaultBrowser: Application | undefined;
  browser: Application;
  tab: Tab;
  mutate: MutatePromise<BrowserTab[] | undefined>;
  frontmostMutate: MutatePromise<Application, undefined>;
}) {
  const { defaultBrowser, browser, tab, mutate, frontmostMutate } = props;
  return (
    <>
      <ActionPanel.Section>
        <Action
          icon={{ fileIcon: browser.path }}
          title={`Open in ${browser.name}`}
          onAction={async () => {
            await closeMainWindow();
            await jumpToBrowserTab(browser, tab);
            await frontmostMutate();
            await mutate();
          }}
        />
        {defaultBrowser && defaultBrowser.name != browser.name && (
          <Action
            icon={{ fileIcon: defaultBrowser.path }}
            title={`Open in ${defaultBrowser.name}`}
            onAction={async () => {
              await open(tab.url, defaultBrowser);
              await frontmostMutate();
              await mutate();
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CreateQuicklink
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          quicklink={{
            link: tab.url,
            name: tab.title,
            application: browser,
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Clipboard}
          title={`Copy URL`}
          shortcut={{ modifiers: ["opt", "cmd"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(tab.url);
            await showHUD("🔗 URL copied to clipboard");
          }}
        />
        <Action
          icon={Icon.Text}
          title={`Copy Title`}
          shortcut={{ modifiers: ["opt", "cmd"], key: "t" }}
          onAction={async () => {
            await Clipboard.copy(tab.title);
            await showHUD("📝 Title copied to clipboard");
          }}
        />
        {isNotEmpty(tab.domain) && (
          <Action
            icon={Icon.Globe}
            title={`Copy Domain`}
            shortcut={{ modifiers: ["opt", "cmd"], key: "d" }}
            onAction={async () => {
              await Clipboard.copy(tab.domain);
              await showHUD("🌐 Domain copied to clipboard");
            }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Repeat}
          title={`Fetch Tabs`}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={async () => {
            await frontmostMutate();
            await mutate();
          }}
        />
        <Action
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title={`Close Tab`}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const toast = await showToast({ title: "Closing", message: tab.title, style: Toast.Style.Animated });
            const ret = await closeBrowserTab(browser, tab);
            if (isEmpty(ret)) {
              toast.title = "Tab Closed";
              toast.style = Toast.Style.Success;
            } else {
              toast.title = "Failed to Close Tab";
              toast.message = ret;
              toast.style = Toast.Style.Failure;
            }
            await frontmostMutate();
            await mutate();
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
