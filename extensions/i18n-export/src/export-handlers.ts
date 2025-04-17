import * as fs from "fs-extra";
import * as path from "path";
import { TranslationsData } from "./notion-api";

// 定义嵌套翻译类型，避免循环引用
interface NestedTranslation {
  [key: string]: string | NestedTranslation;
}

/**
 * 将翻译数据导出为Web使用的模块化JSON文件
 */
export async function exportToWebJson(translationsData: TranslationsData, outputPath: string): Promise<boolean> {
  if (!translationsData || translationsData.entries.length === 0) {
    console.log("没有数据可以导出为JSON");
    return false;
  }

  try {
    // 按模块分组数据
    const enModules: Record<string, NestedTranslation> = {};
    const zhModules: Record<string, NestedTranslation> = {};

    for (const entry of translationsData.entries) {
      const moduleName = entry.module;
      const translationKey = entry.key;
      const enText = entry.en;
      const zhText = entry.zh;

      // 初始化模块字典
      if (!enModules[moduleName]) {
        enModules[moduleName] = {};
      }
      if (!zhModules[moduleName]) {
        zhModules[moduleName] = {};
      }

      // 使用嵌套字典结构存储翻译键
      addNestedTranslation(enModules[moduleName], translationKey, enText);
      addNestedTranslation(zhModules[moduleName], translationKey, zhText);
    }

    // 创建输出目录
    const enDir = path.join(outputPath, "en");
    const zhDir = path.join(outputPath, "zh");

    await fs.ensureDir(enDir);
    await fs.ensureDir(zhDir);

    // 保存为各个模块的JSON文件
    for (const [module, translations] of Object.entries(enModules)) {
      const filename = path.join(enDir, `${module}.json`);
      await fs.writeFile(filename, JSON.stringify(translations, null, 2), "utf-8");
      console.log(`英文翻译已导出到 ${filename}`);
    }

    for (const [module, translations] of Object.entries(zhModules)) {
      const filename = path.join(zhDir, `${module}.json`);
      await fs.writeFile(filename, JSON.stringify(translations, null, 2), "utf-8");
      console.log(`中文翻译已导出到 ${filename}`);
    }

    return true;
  } catch (error) {
    console.error("导出Web JSON时出错:", error);
    return false;
  }
}

/**
 * 将翻译数据导出为iOS格式的本地化文件
 */
export async function exportToIosFiles(translationsData: TranslationsData, outputPath: string): Promise<boolean> {
  if (!translationsData || translationsData.entries.length === 0) {
    console.log("没有数据可以导出为iOS格式");
    return false;
  }

  try {
    // 提取简单的键值对
    const enIosStrings: Record<string, string> = {};
    const zhIosStrings: Record<string, string> = {};

    for (const entry of translationsData.entries) {
      const translationKey = entry.key;
      const enText = entry.en;
      const zhText = entry.zh;

      enIosStrings[translationKey] = enText;
      zhIosStrings[translationKey] = zhText;
    }

    // 按模块对键进行排序和分组
    const modules: Record<string, string[]> = {};

    for (const key of Object.keys(enIosStrings)) {
      const module = key.includes(".") ? key.split(".")[0] : "Other";
      if (!modules[module]) {
        modules[module] = [];
      }
      modules[module].push(key);
    }

    // 创建输出目录
    await fs.ensureDir(outputPath);

    // 生成英文本地化文件
    const enFilepath = path.join(outputPath, "Localizable(English)");
    let enContent = "";

    for (const module of Object.keys(modules).sort()) {
      // 添加模块标记
      enContent += `// MARK: - ${module.charAt(0).toUpperCase() + module.slice(1)}\n`;

      // 添加该模块下的所有键值对
      for (const key of modules[module].sort()) {
        let value = enIosStrings[key] || "";
        // 转义字符串中的双引号
        value = value.replace(/"/g, '\\"');
        enContent += `"${key}" = "${value}";\n`;
      }

      // 模块之间添加空行
      enContent += "\n";
    }

    await fs.writeFile(enFilepath, enContent, "utf-8");
    console.log(`英文iOS本地化文件已导出到 ${enFilepath}`);

    // 生成中文本地化文件
    const zhFilepath = path.join(outputPath, "Localizable(Chinese, Simplified)");
    let zhContent = "";

    for (const module of Object.keys(modules).sort()) {
      // 添加模块标记
      zhContent += `// MARK: - ${module.charAt(0).toUpperCase() + module.slice(1)}\n`;

      // 添加该模块下的所有键值对
      for (const key of modules[module].sort()) {
        let value = zhIosStrings[key] || "";
        // 转义字符串中的双引号
        value = value.replace(/"/g, '\\"');
        zhContent += `"${key}" = "${value}";\n`;
      }

      // 模块之间添加空行
      zhContent += "\n";
    }

    await fs.writeFile(zhFilepath, zhContent, "utf-8");
    console.log(`中文iOS本地化文件已导出到 ${zhFilepath}`);

    return true;
  } catch (error) {
    console.error("导出iOS文件时出错:", error);
    return false;
  }
}

/**
 * 将点分隔的键转换为嵌套字典结构
 */
function addNestedTranslation(targetDict: NestedTranslation, keyPath: string, value: string): void {
  if (!keyPath) {
    return;
  }

  const keys = keyPath.split(".");
  let current = targetDict;

  // 处理除最后一个键以外的所有键
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] === "string") {
      current[key] = {};
    }
    current = current[key] as NestedTranslation;
  }

  // 设置最后一个键的值
  current[keys[keys.length - 1]] = value;
}
