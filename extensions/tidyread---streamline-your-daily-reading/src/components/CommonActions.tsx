import { Action, Icon, openExtensionPreferences } from "@raycast/api";

export default function CommonActions() {
  return (
    <>
      {/* 第一的位置不能变，有些地方依赖此位置 */}
      <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
      <Action.OpenInBrowser icon={Icon.Document} title="View Docs" url="https://tidyread.info/docs" />
      <Action.OpenInBrowser icon={"twitter_logo_white.svg"} title="DM On X" url="https://x.com/jaredliu_bravo" />
      <Action.OpenInBrowser icon={"coffee.svg"} title="Buy Me A Coffee" url="https://www.buymeacoffee.com/jaredliu" />
      <Action.OpenInBrowser icon={Icon.Message} title="Feature Request" url="https://tally.so/r/w8x6dr" />
      <Action.OpenInBrowser icon={Icon.Bug} title="Bug Report" url="https://tally.so/r/3lrYNX" />
    </>
  );
}
