export interface Tool {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  icon: string;
  keywords?: string[];
}

export const tools: Tool[] = [
  {
    id: "time-format",
    name: "Time Format Converter",
    nameZh: "时间戳转换",
    description:
      "Parse various time formats and convert to common development formats",
    descriptionZh: "解析各种时间格式并转换为常用开发格式",
    icon: "📅",
    keywords: ["time", "timestamp", "date", "format", "时间", "时间戳"],
  },
  {
    id: "json-formatter",
    name: "JSON Formatter",
    nameZh: "JSON格式化",
    description:
      "Format, validate, beautify JSON data and filter with JSONPath",
    descriptionZh: "格式化、验证、美化JSON数据并支持JSONPath筛选",
    icon: "📋",
    keywords: ["json", "format", "validate", "格式化"],
  },
  {
    id: "json-compare",
    name: "JSON Compare",
    nameZh: "JSON对比",
    description: "Compare two JSON objects and highlight differences",
    descriptionZh: "比较两个JSON对象并高亮显示差异",
    icon: "🔍",
    keywords: ["json", "compare", "diff", "对比"],
  },
  {
    id: "text-compare",
    name: "Text Compare",
    nameZh: "文本对比",
    description:
      "Compare two text blocks and highlight differences line by line",
    descriptionZh: "逐行比较两个文本块并高亮显示差异",
    icon: "📝",
    keywords: ["text", "compare", "diff", "文本", "对比"],
  },
  {
    id: "curl-compare",
    name: "CURL Compare",
    nameZh: "CURL对比",
    description:
      "Compare two CURL commands and highlight parameter differences",
    descriptionZh: "比较两个CURL命令并高亮显示参数差异",
    icon: "🔄",
    keywords: ["curl", "compare", "http", "对比"],
  },
  {
    id: "cookie-formatter",
    name: "Cookie Formatter",
    nameZh: "Cookie格式化",
    description: "Convert cookie strings or list format to JSON format",
    descriptionZh: "将Cookie字符串或列表格式转换为JSON格式",
    icon: "🍪",
    keywords: ["cookie", "format", "格式化"],
  },
  {
    id: "base64-encode",
    name: "Base64 Encode/Decode",
    nameZh: "Base64编解码",
    description: "Encode and decode Base64 strings",
    descriptionZh: "编码和解码Base64字符串",
    icon: "🔐",
    keywords: ["base64", "encode", "decode", "编码", "解码"],
  },
  {
    id: "base64-image",
    name: "Base64 Image Decoder",
    nameZh: "Base64图像编解码",
    description: "Decode Base64 image data and preview images",
    descriptionZh: "解码Base64图像数据并预览图像",
    icon: "🖼️",
    keywords: ["base64", "image", "图像", "图片"],
  },
  {
    id: "url-encode",
    name: "URL Encode/Decode",
    nameZh: "URL编解码",
    description: "Encode and decode URL strings",
    descriptionZh: "编码和解码URL字符串",
    icon: "🔗",
    keywords: ["url", "encode", "decode", "编码", "解码"],
  },
  {
    id: "curl-to-requests",
    name: "CURL to Requests",
    nameZh: "CURL转Requests",
    description: "Convert CURL commands to Python requests code",
    descriptionZh: "将CURL命令转换为Python requests代码",
    icon: "⚡",
    keywords: ["curl", "python", "requests", "convert", "转换"],
  },
  {
    id: "html-renderer",
    name: "HTML Renderer",
    nameZh: "HTML渲染器",
    description: "Real-time preview and test HTML code",
    descriptionZh: "实时预览和测试HTML代码",
    icon: "🌐",
    keywords: ["html", "preview", "render", "渲染"],
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    nameZh: "UUID生成",
    description: "Generate and decode UUIDs and ULIDs",
    descriptionZh: "生成和解码UUID和ULID",
    icon: "🎲",
    keywords: ["uuid", "ulid", "generate", "生成"],
  },
  {
    id: "qr-generator",
    name: "QR Code Generator",
    nameZh: "二维码生成",
    description: "Generate QR codes and read QR codes from images",
    descriptionZh: "生成二维码并从图像中读取二维码",
    icon: "📱",
    keywords: ["qr", "qrcode", "generate", "二维码", "生成"],
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    nameZh: "哈希生成器",
    description: "Generate various hash values from text input",
    descriptionZh: "从文本输入生成各种哈希值",
    icon: "#️⃣",
    keywords: ["hash", "md5", "sha", "哈希", "生成"],
  },
  {
    id: "favicon-generator",
    name: "Favicon Generator",
    nameZh: "Favicon生成器",
    description: "Upload images to generate favicon icons in various sizes",
    descriptionZh: "上传图片生成各种尺寸的favicon图标",
    icon: "🎨",
    keywords: ["favicon", "icon", "generate", "图标", "生成"],
  },
  {
    id: "domain-generator",
    name: "Domain Generator",
    nameZh: "域名生成器",
    description:
      "Generate creative domain names based on keywords and check availability",
    descriptionZh: "根据关键词生成创意域名并检查可用性",
    icon: "🌍",
    keywords: ["domain", "generate", "域名", "生成", "ai"],
  },
  {
    id: "id-photo-generator",
    name: "ID Photo Generator",
    nameZh: "证件照生成",
    description:
      "Upload a photo to generate ID photos of various specifications",
    descriptionZh: "上传照片生成各种规格的证件照",
    icon: "📷",
    keywords: ["photo", "id", "证件照", "生成", "ai"],
  },
  {
    id: "photo-enhancer",
    name: "Photo Enhancer",
    nameZh: "自动修图",
    description: "Automatically enhance photo effects using AI technology",
    descriptionZh: "使用AI技术自动增强照片效果",
    icon: "✨",
    keywords: ["photo", "enhance", "ai", "修图", "图片"],
  },
  {
    id: "food-calorie-annotator",
    name: "Food Calorie Annotator",
    nameZh: "食物卡路里标注",
    description:
      "Automatically identify food and annotate calorie information using AI",
    descriptionZh: "使用AI技术自动识别食物并标注卡路里信息",
    icon: "🍽️",
    keywords: ["food", "calorie", "ai", "食物", "卡路里"],
  },
  {
    id: "json-to-sql",
    name: "JSON to SQL",
    nameZh: "JSON转SQL",
    description: "Convert JSON data to SQL statements for different databases",
    descriptionZh: "将JSON数据转换为不同数据库的SQL语句",
    icon: "💾",
    keywords: ["json", "sql", "database", "convert", "转换"],
  },
  {
    id: "js-formatter",
    name: "JavaScript Formatter",
    nameZh: "JS格式化",
    description:
      "Format and beautify JavaScript/TypeScript code with syntax highlighting",
    descriptionZh: "格式化和美化JavaScript/TypeScript代码，支持语法高亮",
    icon: "💻",
    keywords: ["javascript", "typescript", "format", "格式化", "js"],
  },
];
