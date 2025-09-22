import { useMemo } from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { LibraryType } from "../types";
import { LibraryDetail } from "./library-detail";

const Actions = ({
  library,
  isShowingDetail,
  setIsShowingDetail,
}: {
  library: LibraryType;
  isShowingDetail: boolean;
  setIsShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Actions">
        <Action.OpenInBrowser
          icon={Icon.Book}
          title="Documentation"
          url={library.github.urls.homepage || library.githubUrl}
        />
        <Action
          icon={isShowingDetail ? Icon.AppWindow : Icon.AppWindowSidebarLeft}
          title={isShowingDetail ? "Hide Details" : "Show Details"}
          onAction={() => setIsShowingDetail((prev) => !prev)}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Installation">
        <ActionPanel.Submenu title="Copy Install Command" icon={Icon.Terminal}>
          <Action.CopyToClipboard
            icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="expo"
            content={`npx expo install ${library.github.name}`}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <Action.CopyToClipboard
            icon={{ source: Icon.Terminal, tintColor: Color.Red }}
            title="npm"
            content={`npm install ${library.github.name}`}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
          />
          <Action.CopyToClipboard
            icon={{ source: Icon.Terminal, tintColor: Color.Blue }}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="yarn"
            content={`yarn add ${library.github.name}`}
            shortcut={{ modifiers: ["cmd"], key: "3" }}
          />
          <Action.CopyToClipboard
            icon={{ source: Icon.Terminal, tintColor: Color.Yellow }}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="pnpm"
            content={`pnpm install ${library.github.name}`}
            shortcut={{ modifiers: ["cmd"], key: "4" }}
          />
          <Action.CopyToClipboard
            icon={{ source: Icon.Terminal, tintColor: Color.Magenta }}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="bun"
            content={`bun install ${library.github.name}`}
            shortcut={{ modifiers: ["cmd"], key: "5" }}
          />
        </ActionPanel.Submenu>
      </ActionPanel.Section>

      <ActionPanel.Section title="Additional Resources">
        <Action.OpenInBrowser
          title="View on GitHub"
          icon={{
            source: "github-icon.png",
            tintColor: Color.PrimaryText,
          }}
          url={library.githubUrl}
        />
        <Action.OpenInBrowser
          // eslint-disable-next-line @raycast/prefer-title-case
          title="View on NPM"
          icon={{ source: Icon.Box, tintColor: Color.Red }}
          url={`https://www.npmjs.com/package/${library.npmPkg}`}
        />
        <Action.CopyToClipboard
          title="Copy Library Name"
          content={library.github.name}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export const LibraryListItem = ({
  library,
  isShowingDetail,
  setIsShowingDetail,
}: {
  library: LibraryType;
  isShowingDetail: boolean;
  setIsShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const accessories = useMemo(
    () =>
      isShowingDetail
        ? [
            {
              icon: library.unmaintained ? { source: Icon.Hammer, tintColor: Color.Yellow } : undefined,
              tooltip: "Not actively maintained",
            },
          ]
        : [
            {
              icon: library.unmaintained ? { source: Icon.Hammer, tintColor: Color.Yellow } : undefined,
              tooltip: "Not actively maintained",
            },
            {
              icon: { source: Icon.Star, tintColor: Color.Green },
              text: library.github.stats.stars.toLocaleString(),
              tooltip: "Stars",
            },
            {
              icon: { source: Icon.Download, tintColor: Color.Blue },
              text: library.npm?.downloads?.toLocaleString(),
              tooltip: "Monthly Downloads",
            },
            {
              icon: library.android ? { source: Icon.Mobile, tintColor: Color.Green } : undefined,
              tooltip: "Android Support",
            },
            { icon: library.ios ? { source: Icon.Mobile, tintColor: Color.Blue } : undefined, tooltip: "iOS Support" },
            { icon: library.web ? { source: Icon.Globe, tintColor: Color.Orange } : undefined, tooltip: "Web Support" },
          ],
    [isShowingDetail],
  );

  return (
    <List.Item
      icon={{
        source: "github-icon.png",
        tintColor: Color.PrimaryText,
      }}
      title={library.github.name}
      keywords={library.github.topics}
      subtitle={{ tooltip: library.github.description }}
      accessories={accessories}
      detail={<LibraryDetail library={library} />}
      actions={<Actions library={library} isShowingDetail={isShowingDetail} setIsShowingDetail={setIsShowingDetail} />}
    />
  );
};
