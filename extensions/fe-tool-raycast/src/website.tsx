import { List, ActionPanel, Action, getPreferenceValues, open } from "@raycast/api";

const websiteList = [
  {
    title: "npm",
    subtitle: "npm官网",
    url: "https://www.npmjs.com",
    icon: {
      value: "https://qn.huat.xyz/icon/npm.png",
      tooltip: "npm",
    },
  },
  {
    title: "tinypng",
    subtitle: "图片压缩",
    url: "https://tinypng.com/",
    icon: {
      value: "https://tinypng.com/static/images/george-anim/large_george.webp",
      tooltip: "tinypng",
    },
  },
  {
    title: "convertio",
    subtitle: "文件转换器 将您的文件转换成任意格式",
    url: "https://convertio.co/zh/",
    icon: {
      value: "https://qn.huat.xyz/icon/convertio.png",
      tooltip: "convertio",
    },
  },
  {
    title: "react",
    subtitle: "The library for web and native user interfaces",
    url: "https://react.dev/",
    icon: {
      value: "https://qn.huat.xyz/icon/React.png",
      tooltip: "react",
    },
  },
  {
    title: "vue",
    subtitle: "Vue 是一款用于构建用户界面的 JavaScript 框架",
    url: "https://cn.vuejs.org/",
    icon: {
      value: "https://qn.huat.xyz/icon/Vue.png",
      tooltip: "vue",
    },
  },
  {
    title: "网易邮箱大师",
    subtitle: "网易邮箱大师",
    url: "https://dashi.163.com/apps/webmail",
    icon: {
      value: "https://qn.huat.xyz/icon/%E7%BD%91%E6%98%93%E9%82%AE%E7%AE%B1%E5%A4%A7%E5%B8%88.png",
      tooltip: "网易邮箱大师",
    },
  },
];

export default function Command() {
  const { query } = getPreferenceValues();
  console.log("query", query);

  const filteredComponents = websiteList
    .filter((site) => {
      if (!query) {
        return true;
      }
      const titleInclude = site.title.toLowerCase().includes(query?.toLowerCase());
      const subTitleInclude = site.subtitle.toLowerCase().includes(query?.toLowerCase());
      const urlInclude = site.url.toLowerCase().includes(query?.toLowerCase());
      return titleInclude || subTitleInclude || urlInclude;
    })
    .map((site) => ({
      title: site.title,
      subtitle: site.subtitle,
      url: site.url,
      icon: site.icon,
    }));

  return (
    <List>
      {filteredComponents.map((item) => (
        <List.Item
          icon={item.icon}
          key={item.title}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action
                title="Open Browser"
                onAction={async () => {
                  await open(item.url);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
