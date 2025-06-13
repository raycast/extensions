import { Translation } from "./types";
import en from "./en";
import zhCN from "./zh-CN";

// 集中管理所有翻译
const translations: Record<string, Translation> = {
  en,
  "zh-CN": zhCN,
  // 添加更多语言只需在此处添加，无需修改其他文件
};

export { translations, Translation };
