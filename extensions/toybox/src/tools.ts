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
  /**
   * 主入口搜索使用的关键词。
   *
   * Raycast 内置过滤按 `title` + `keywords` 匹配；为了贴合规格「按 title /
   * subtitle / keywords 过滤」的契约，把 description 中具有检索意义的中文
   * 关键词也补充进 `keywords`，确保中文用户搜「格式化」「JSONPath」
   * 「日志」等也能命中。
   */
  keywords: string[];
  /** 主入口列表中显示的图标。 */
  icon: Icon;
};

export const tools: Tool[] = [
  {
    name: "http-client",
    title: "HTTP Client",
    description: "即用即走的原生 HTTP 客户端。",
    keywords: ["http", "client", "curl", "request", "api", "fetch", "postman", "rest", "请求", "接口", "调试", "HTTP"],
    icon: Icon.Globe,
  },
  {
    name: "json",
    title: "JSON 查看器",
    description: "在 Raycast 中以树形结构浏览任意 JSON 文本。",
    keywords: ["json", "tree", "viewer", "path", "node", "browse", "格式化", "树形", "浏览", "JSONPath", "节点"],
    icon: Icon.Code,
  },
  {
    name: "mybatis",
    title: "MyBatis SQL 格式化器",
    description: "将 MyBatis 准备参数日志转换为可执行的 SQL 语句。",
    keywords: ["mybatis", "sql", "log", "format", "格式化", "日志", "SQL", "参数", "绑定", "占位符"],
    icon: Icon.Terminal,
  },
];
