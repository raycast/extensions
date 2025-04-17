import { Client } from "@notionhq/client";

export interface TranslationItem {
  module: string;
  key: string;
  en: string;
  zh: string;
}

export interface TranslationsData {
  entries: TranslationItem[];
  modules: Set<string>;
}

interface NotionTextItem {
  plain_text?: string;
  [key: string]: unknown;
}

// Notion数据结构类型
interface NotionPropertyValue {
  type?: string;
  title?: NotionTextItem[];
  rich_text?: NotionTextItem[];
  select?: {
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface NotionItemProperties {
  [key: string]: NotionPropertyValue;
}

interface NotionItem {
  properties: NotionItemProperties;
  [key: string]: unknown;
}

/**
 * 从Notion获取并处理数据
 */
export async function getNotionData(apiKey: string, databaseId: string): Promise<TranslationsData | null> {
  // 初始化Notion客户端
  const notion = new Client({ auth: apiKey });

  try {
    console.log(`正在连接Notion数据库：${databaseId}`);
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    // 提取结果
    const results = response.results || [];

    if (results.length === 0) {
      console.log("数据库中没有找到数据。");
      return null;
    }

    // 处理数据
    const translationsData: TranslationsData = {
      entries: [], // 将存储所有翻译条目
      modules: new Set<string>(), // 跟踪所有模块
    };

    // 处理没有模块的项目的默认模块名
    const defaultModule = "common";

    for (const item of results) {
      const processedItem = processI18nItem(item as NotionItem);
      if (!processedItem) {
        continue;
      }

      // 如果模块为空，使用默认模块名
      let moduleName = processedItem.module;
      if (!moduleName) {
        moduleName = defaultModule;
      } else {
        moduleName = moduleName.toLowerCase();
      }

      // 更新处理后的模块名
      processedItem.module = moduleName;

      const translationKey = processedItem.key;

      // 跳过没有翻译键的项
      if (!translationKey) {
        console.log(`警告：跳过没有翻译键的项目: ${JSON.stringify(processedItem)}`);
        continue;
      }

      // 添加到数据集合
      translationsData.entries.push(processedItem);
      translationsData.modules.add(moduleName);
    }

    console.log(`已处理 ${translationsData.entries.length} 条翻译数据`);
    console.log(`发现的模块: ${Array.from(translationsData.modules).sort()}`);

    return translationsData;
  } catch (error) {
    console.error("获取Notion数据时出错:", error);
    throw error;
  }
}

/**
 * 处理i18n项目，提取模块、翻译键、中英文翻译
 */
function processI18nItem(item: NotionItem): TranslationItem | null {
  try {
    const properties = item.properties || {};

    // 提取模块
    const moduleData = properties.Module || {};
    let module = null;
    if (moduleData && moduleData.select) {
      module = moduleData.select.name;
    }

    // 提取翻译键 - 从key字段获取，这是title类型
    const keyData = properties.key || {};
    let translationKey = "";
    if (keyData && keyData.type === "title") {
      const titleObjects = keyData.title || [];
      translationKey = titleObjects.map((t: NotionTextItem) => t.plain_text || "").join("");
    }

    // 提取英文翻译 - 从en字段获取，这是rich_text类型
    const enData = properties.en || {};
    let enText = "";
    if (enData && enData.type === "rich_text") {
      const richText = enData.rich_text || [];
      enText = richText.map((t: NotionTextItem) => t.plain_text || "").join("");
    }

    // 提取中文翻译 - 从zh字段获取，这是rich_text类型
    const zhData = properties.zh || {};
    let zhText = "";
    if (zhData && zhData.type === "rich_text") {
      const richText = zhData.rich_text || [];
      zhText = richText.map((t: NotionTextItem) => t.plain_text || "").join("");
    }

    return {
      module: module || "",
      key: translationKey,
      en: enText,
      zh: zhText,
    };
  } catch (error) {
    console.error("处理i18n项目时出错:", error);
    return null;
  }
}
