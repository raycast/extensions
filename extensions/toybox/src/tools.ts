import { Icon } from "@raycast/api";

/**
 * ToyBox 工具目录的单一来源。
 *
 * 每条记录对应一个子命令：既可以由 Raycast 直接调用（在 `package.json`
 * 中已注册同名 `name`），也可以从中央入口通过 `launchCommand` 启动。
 */
export type Tool = {
  /** 内部标识符，必须与 `package.json` 中的命令名一致。 */
  name: string;
  /** 在主入口列表中显示的标题。 */
  title: string;
  /** 在主入口副标题以及 Raycast 命令面板中显示的简要说明。 */
  description: string;
  /** 主入口动态搜索使用的关键词。 */
  keywords: string[];
  /** 主入口列表中显示的图标。 */
  icon: Icon;
};

export const tools: Tool[] = [
  {
    name: "json",
    title: "JSON 查看器",
    description: "在 Raycast 中以树形结构浏览任意 JSON 文本。",
    keywords: ["json", "tree", "viewer", "path", "node", "browse"],
    icon: Icon.Code,
  },
  {
    name: "mybatis",
    title: "MyBatis SQL 格式化器",
    description: "将 MyBatis 准备参数日志转换为可执行的 SQL 语句。",
    keywords: ["mybatis", "sql", "log", "format"],
    icon: Icon.Terminal,
  },
];
