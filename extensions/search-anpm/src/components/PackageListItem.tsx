import { List, Icon, ActionPanel, Action, getPreferenceValues, showToast, Toast, Keyboard } from "@raycast/api";
import tinyRelativeDate from "tiny-relative-date";
import type { Package } from "../types/base";
import { historyModel, type HistoryItem } from "../model";
import { Preferences } from "../types/search";
import { parsedRepo } from "../utils";

interface PackageListItemProps {
  result: Package;
  searchTerm?: string;
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}

export const PackageListItem = ({ result, setHistory }: PackageListItemProps): JSX.Element => {
  const { defaultOpenAction }: Preferences = getPreferenceValues();
  const pkg = result;

  const handleAddToHistory = async () => {
    const history = await historyModel.addToHistory({ term: pkg?.latest?.name, type: "package" });
    setHistory?.(history);
    showToast(Toast.Style.Success, `Added ${pkg?.latest?.name} to history`);
  };

  const repo = parsedRepo(pkg?.latest?.repository);

  const openActions = {
    // 打开仓库
    openRepository: pkg?.latest?.repository ? (
      <Action.OpenInBrowser
        key="openRepository"
        url={repo.url || ""}
        title="Open Repository"
        onOpen={handleAddToHistory}
      />
    ) : null,
    // 打开首页
    openHomepage: pkg.latest?.homepage ? (
      <Action.OpenInBrowser
        key="openHomepage"
        url={pkg?.latest?.homepage}
        title="Open Homepage"
        icon={Icon.Link}
        onOpen={handleAddToHistory}
      />
    ) : null,
    // 打开 anpm 页面
    anpmPackagePage: (
      <Action.OpenInBrowser
        key="anpmPackagePage"
        url={`https://anpm.alibaba-inc.com/package/${pkg?.latest?.name}`}
        title="Open Anpm Package Page"
        icon={{
          source: "anpm-icon.png",
        }}
        onOpen={handleAddToHistory}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    ),
  };

  // listItem 右侧的快速访问标签
  const accessories: List.Item.Accessory[] = [
    {
      icon: Icon.Tag,
      tooltip: `Latest version: ${pkg?.latest?.version}`,
    },
    // 这里主要是针对于 请求后的 repo 解析结果进行判断，
    // 对于 @ali/uni-api 这种格式的包，repo 解析结果是 null，但是可以使用 https://anpm.alibaba-inc.com/package 方式打开
    repo?.type
      ? repo?.type === "github"
        ? {
            text: `${repo?.type}`,
            tooltip: `platform`,
          }
        : repo?.type === "gitlab"
          ? {
              text: `${repo?.type}`,
              tooltip: `platform`,
            }
          : repo?.type === "alibaba-inc"
            ? {
                text: `${repo?.type}`,
                tooltip: `platform`,
              }
            : {}
      : {},
  ];

  accessories.push({
    icon: Icon.Calendar,
    tooltip: `Last updated: ${tinyRelativeDate(new Date(pkg?.latest?._cnpmcore_publish_time))}`,
  });

  return (
    <List.Item
      id={pkg?.latest?.name}
      key={pkg?.latest?.name}
      title={pkg?.latest?.name}
      subtitle={pkg?.latest?.description}
      icon={Icon.Box}
      accessories={accessories}
      keywords={pkg?.latest?.keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            {Object.entries(openActions)
              .sort(([a]) => {
                if (a === defaultOpenAction) {
                  return -1;
                } else {
                  return 0;
                }
              })
              .map(([, action]) => {
                if (!action) {
                  return null;
                }
                return action;
              })
              .filter(Boolean)}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
