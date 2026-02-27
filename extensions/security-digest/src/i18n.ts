import { getPreferenceValues } from "@raycast/api";

export type Language = "en" | "zh";

const translations = {
  en: {
    // Categories
    cat_vulnerability: "🛡️ Vulnerability",
    cat_intelligence: "🔥 Intelligence",
    cat_news: "📰 News",
    cat_all: "📦 All",
    label_vulnerability: "CVE",
    label_intelligence: "Intel",
    label_news: "News",

    // General UI
    search_placeholder: "Search security news...",
    filter_tooltip: "Filter by category",
    items_count: "{count} items",
    time_window: "Last {hours}h",
    no_news_title: "No news found",
    no_news_desc: "Try adjusting your time window or check your feeds",
    load_error_title: "Failed to load feeds",

    // Actions
    action_summarize: "Summarize with AI",
    action_open_browser: "Open in Browser",
    action_copy_md: "Copy Markdown Link",
    action_copy_url: "Copy URL",
    action_refresh: "Refresh",

    // AI Summary
    summary_title: "AI Summary",
    summary_loading: "Generating summary...",
    summary_original: "Original Content",
    summary_read_full: "Read full article",
    summary_error_title: "AI Error",
    summary_pro_required: "AI Access Required",
    summary_pro_desc:
      "This feature requires Raycast Pro. Please upgrade to use built-in AI summaries.",
    summary_upgrade_btn: "Upgrade to Raycast Pro",
    summary_check_status: "Check Raycast AI Status",
    summary_prompt: `Summarize the following security news item for a security professional. 
Highlight the key threat, affected systems (if any), and recommended actions.
Keep it concise and professional.

Title: {title}
Source: {source}
Content: {content}`,

    // Sources
    sources_title: "Manage RSS Sources",
    sources_search_placeholder: "Search feeds...",
    sources_add_title: "Add RSS Feed",
    sources_feed_name: "Feed Name",
    sources_feed_url: "Feed URL",
    sources_feed_category: "Category (optional)",
    sources_save_btn: "Save Feed",
    sources_delete_btn: "Delete Feed",
    sources_builtin: "Built-in Feed",
    sources_custom: "Custom Feed",
  },
  zh: {
    // 类别
    cat_vulnerability: "🛡️ 漏洞风险",
    cat_intelligence: "🔥 威胁情报",
    cat_news: "📰 安全资讯",
    cat_all: "📦 全部",
    label_vulnerability: "漏洞",
    label_intelligence: "情报",
    label_news: "快讯",

    // 通用 UI
    search_placeholder: "搜索安全资讯...",
    filter_tooltip: "按类别筛选",
    items_count: "{count} 条内容",
    time_window: "最近 {hours} 小时",
    no_news_title: "未找到相关资讯",
    no_news_desc: "尝试调整时间范围或检查订阅源",
    load_error_title: "加载订阅失败",

    // 操作
    action_summarize: "AI 总结",
    action_open_browser: "浏览器打开",
    action_copy_md: "复制 Markdown 链接",
    action_copy_url: "复制 URL",
    action_refresh: "刷新",

    // AI 总结
    summary_title: "AI 总结",
    summary_loading: "正在生成总结...",
    summary_original: "原文内容",
    summary_read_full: "阅读原文",
    summary_error_title: "AI 错误",
    summary_pro_required: "需要 AI 权限",
    summary_pro_desc: "此功能需要 Raycast Pro。请升级以使用内置 AI 总结。",
    summary_upgrade_btn: "升级 Raycast Pro",
    summary_check_status: "检查 Raycast AI 状态",
    summary_prompt: `请作为一名资深安全专家，总结以下安全新闻。
重点说明关键威胁、受影响的系统（如有）以及建议的处置措施。
保持专业且简洁。

标题: {title}
来源: {source}
内容: {content}`,

    // 订阅管理
    sources_title: "管理 RSS 订阅",
    sources_search_placeholder: "搜索订阅源...",
    sources_add_title: "添加 RSS 订阅",
    sources_feed_name: "订阅名称",
    sources_feed_url: "订阅 URL",
    sources_feed_category: "类别 (可选)",
    sources_save_btn: "保存订阅",
    sources_delete_btn: "删除订阅",
    sources_builtin: "内置订阅",
    sources_custom: "自定义订阅",
  },
};

export function t(
  key: keyof (typeof translations)["en"],
  params?: Record<string, string | number>,
  lang?: Language,
): string {
  const preferences = !lang ? getPreferenceValues() : null;
  const currentLang = lang || (preferences?.language as Language) || "en";
  let text = translations[currentLang][key] || translations.en[key];

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }

  return text;
}
