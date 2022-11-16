import { Clipboard, Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { listIcon, listIconDark } from "./utils/common-utils";
import { getTrends } from "./hooks/hooks";
import { douyinSearchUrl } from "./utils/trend-utils";

export default function TrendOfWeibo() {
  const { weiBoTrends, zhiHuTrends, douYinTrends } = getTrends();

  return (
    <MenuBarExtra
      isLoading={weiBoTrends.length === 0 && zhiHuTrends.length === 0 && douYinTrends.length === 0}
      icon={{ source: { light: "menu-bar-icon/trend-menu-bar.png", dark: "menu-bar-icon/trend-menu-bar@dark.png" } }}
    >
      <MenuBarExtra.Item
        title={"WeiBo"}
        icon={{ source: { light: "menu-bar-icon/trend-weibo.png", dark: "menu-bar-icon/trend-weibo@dark.png" } }}
      />
      {weiBoTrends?.map((value, index) => {
        return (
          <MenuBarExtra.Item
            key={index + value.url}
            icon={{
              source: {
                light: `${listIcon[index]}`,
                dark: `${listIconDark[index]}`,
              },
            }}
            title={value.name + `    ${(value.hot / 10000).toFixed(1)}w`}
            onAction={async (event: MenuBarExtra.ActionEvent) => {
              if (event.type == "left-click") {
                await open(value.url);
              } else {
                await Clipboard.copy(value.name);
              }
            }}
          />
        );
      })}

      <MenuBarExtra.Item
        title={"ZhiHu"}
        icon={{ source: { light: "menu-bar-icon/trend-zhihu.png", dark: "menu-bar-icon/trend-zhihu@dark.png" } }}
      />
      {zhiHuTrends?.map((value, index) => {
        return (
          <MenuBarExtra.Item
            key={index + value.url}
            icon={{
              source: {
                light: `${listIcon[index]}`,
                dark: `${listIconDark[index]}`,
              },
            }}
            title={value.query}
            onAction={async (event: MenuBarExtra.ActionEvent) => {
              if (event.type == "left-click") {
                await open(value.url);
              } else {
                await Clipboard.copy(value.name);
              }
            }}
          />
        );
      })}

      <MenuBarExtra.Item
        title={"DouYin"}
        icon={{ source: { light: "menu-bar-icon/trend-douyin.png", dark: "menu-bar-icon/trend-douyin@dark.png" } }}
      />
      {douYinTrends?.map((value, index) => {
        return (
          <MenuBarExtra.Item
            key={index + value.name}
            icon={{
              source: {
                light: `${listIcon[index]}`,
                dark: `${listIconDark[index]}`,
              },
            }}
            title={value.name + `    ${(value.hot / 10000).toFixed(1)}w`}
            onAction={async (event: MenuBarExtra.ActionEvent) => {
              if (event.type == "left-click") {
                await open(douyinSearchUrl + encodeURIComponent(value.name));
              } else {
                await Clipboard.copy(value.name);
              }
            }}
          />
        );
      })}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={"Preferences"}
        icon={Icon.Gear}
        onAction={() => {
          openCommandPreferences().then();
        }}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  );
}
