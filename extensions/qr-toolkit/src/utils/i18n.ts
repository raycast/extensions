import { getPreferenceValues } from "@raycast/api";

type Lang = "en" | "zh";

interface Prefs {
  language: "auto" | "en" | "zh";
}

function detectSystemLang(): Lang {
  const lang = process.env.LANG ?? process.env.LANGUAGE ?? "";
  return lang.startsWith("zh") ? "zh" : "en";
}

let _lang: Lang | null = null;

export function getLang(): Lang {
  if (_lang) return _lang;
  try {
    const prefs = getPreferenceValues<Prefs>();
    _lang = prefs.language === "auto" ? detectSystemLang() : prefs.language;
  } catch {
    _lang = detectSystemLang();
  }
  return _lang;
}

const translations = {
  en: {
    // decode
    decode_file_title: "Image File",
    decode_clipboard_title: "Clipboard Image Detected",
    decode_clipboard_hint: "Leave file picker empty to decode the clipboard image",
    decode_submit: "Decode",
    decode_scanning: "Scanning clipboard…",
    decode_decoding: "Decoding QR code…",
    decode_no_qr: "No QR code found in this image.",
    decode_error_title: "Decode Failed",
    decode_result_title: "Decoded Content",
    decode_type: "Type",
    decode_length: "Characters",
    decode_network: "Network",
    decode_encryption: "Encryption",
    decode_back: "Go Back",
    decode_copy: "Copy Content",
    decode_open_url: "Open URL",
    decode_copy_password: "Copy Wi-Fi Password",
    decode_no_image: "Please select an image or copy one to clipboard first",
    // generate
    generate_content_title: "Content",
    generate_content_placeholder: "Enter text, URL, or any content…",
    generate_submit: "Generate",
    generate_generating: "Generating QR code…",
    generate_empty: "Please enter some content",
    generate_error_title: "Generation Failed",
    generate_result_title: "QR Code Preview",
    generate_chars: "Characters",
    generate_type: "Content Type",
    generate_ecc: "Error Correction",
    generate_dark_color: "Foreground Color",
    generate_light_color: "Background Color",
    generate_margin: "Margin",
    generate_ecc_l: "Low — 7%",
    generate_ecc_m: "Medium — 15%",
    generate_ecc_q: "Quartile — 25%",
    generate_ecc_h: "High — 30%",
    generate_color_error: "Must be a hex color, e.g. #1a2b3c",
    generate_copy_png: "Copy PNG to Clipboard",
    generate_save_png: "Save PNG to Desktop",
    generate_copy_svg: "Copy SVG",
    generate_copy_text: "Copy Original Text",
    generate_copied: "PNG copied to clipboard",
    generate_saved: "Saved to Desktop",
    generate_save_failed: "Failed to save PNG",
    generate_copy_failed: "Failed to copy PNG",
    generate_back: "Go Back",
    // content types
    type_url: "URL",
    type_wifi: "Wi-Fi",
    type_vcard: "Contact",
    type_text: "Plain Text",
  },
  zh: {
    decode_file_title: "图片文件",
    decode_clipboard_title: "检测到剪贴板图片",
    decode_clipboard_hint: "不选择文件，将自动解码剪贴板中的图片",
    decode_submit: "解码",
    decode_scanning: "正在读取剪贴板…",
    decode_decoding: "正在识别二维码…",
    decode_no_qr: "未在图片中检测到二维码",
    decode_error_title: "解码失败",
    decode_result_title: "解码结果",
    decode_type: "类型",
    decode_length: "字符数",
    decode_network: "网络名称",
    decode_encryption: "加密方式",
    decode_back: "返回",
    decode_copy: "复制内容",
    decode_open_url: "打开链接",
    decode_copy_password: "复制 Wi-Fi 密码",
    decode_no_image: "请先选择图片，或将图片复制到剪贴板",
    generate_content_title: "内容",
    generate_content_placeholder: "输入文本、链接或任意内容…",
    generate_submit: "生成",
    generate_generating: "正在生成二维码…",
    generate_empty: "请输入内容",
    generate_error_title: "生成失败",
    generate_result_title: "二维码预览",
    generate_chars: "字符数",
    generate_type: "内容类型",
    generate_ecc: "纠错级别",
    generate_dark_color: "前景色",
    generate_light_color: "背景色",
    generate_margin: "边距",
    generate_ecc_l: "低 — 7%",
    generate_ecc_m: "中 — 15%",
    generate_ecc_q: "较高 — 25%",
    generate_ecc_h: "高 — 30%",
    generate_color_error: "请输入有效的十六进制颜色，如 #1a2b3c",
    generate_copy_png: "复制 PNG 到剪贴板",
    generate_save_png: "保存 PNG 到桌面",
    generate_copy_svg: "复制 SVG",
    generate_copy_text: "复制原始文本",
    generate_copied: "PNG 已复制到剪贴板",
    generate_saved: "已保存到桌面",
    generate_save_failed: "保存 PNG 失败",
    generate_copy_failed: "复制 PNG 失败",
    generate_back: "返回",
    type_url: "链接",
    type_wifi: "Wi-Fi",
    type_vcard: "名片",
    type_text: "纯文本",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey): string {
  const lang = getLang();
  return translations[lang][key];
}
