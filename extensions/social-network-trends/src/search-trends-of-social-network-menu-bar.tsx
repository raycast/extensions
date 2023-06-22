import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { getAllTrends } from "./hooks/hooks";
import { TrendMenubarItem } from "./components/trend-menubar-item";
import { timeStampToDate } from "./utils/common-utils";

export default function SearchTrendsOfSocialNetworkMenuBar() {
  const {
    weiBoTrends,
    zhiHuTrends,
    douYinTrends,
    baiduTrend,
    toutiaoTrend,
    toutiaoNewsTrend,
    biliTrend,
    loading,
    lastRefreshTime,
  } = getAllTrends(10);

  return (
    <MenuBarExtra
      isLoading={loading}
      icon={{ source: { light: "menu-bar-icon/trend-menu-bar.png", dark: "menu-bar-icon/trend-menu-bar@dark.png" } }}
    >
      <MenuBarExtra.Section title={"WeiBo"}>
        {weiBoTrends?.map((value, index) => {
          return <TrendMenubarItem key={index + value.name} trend={value} index={index} />;
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"ZhiHu"}>
        {zhiHuTrends?.map((value, index) => {
          return <TrendMenubarItem key={index + value.name} trend={value} index={index} />;
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"DouYin"}>
        {douYinTrends?.map((value, index) => {
          return <TrendMenubarItem key={index + value.name} trend={value} index={index} />;
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"BaiDu"}>
        {baiduTrend?.map((value, index) => {
          return <TrendMenubarItem key={index + value.name} trend={value} index={index} />;
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"TouTiao"}>
        {toutiaoTrend?.map((value, index) => {
          return <TrendMenubarItem key={index + value.name} trend={value} index={index} />;
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"TouTiao News"}>
        {toutiaoNewsTrend?.map((value, index) => {
          return <TrendMenubarItem key={index + value.name} trend={value} index={index} />;
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title={"BiliBili"}>
        {biliTrend?.map((value, index) => {
          return <TrendMenubarItem key={index + value.name} trend={value} index={index} />;
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Last refresh at ${timeStampToDate(lastRefreshTime)}`}
          icon={Icon.Repeat}
          onAction={() => {
            console.log("User Click");
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={"Preferences"}
          icon={Icon.Gear}
          onAction={() => {
            openCommandPreferences().then();
          }}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
