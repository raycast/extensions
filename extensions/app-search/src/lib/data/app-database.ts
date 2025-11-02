/**
 * Application categories database
 * Maps keywords to common application names for intelligent matching
 */

import { AppCategory } from "../../types";

export const APP_CATEGORIES: Record<string, AppCategory> = {
  browser: {
    keywords: ["browser", "web", "internet", "ブラウザ", "インターネット", "웹", "浏览器", "navegador", "navigateur"],
    commonApps: [
      "Google Chrome",
      "Safari",
      "Firefox",
      "Brave",
      "Microsoft Edge",
      "Arc",
      "Opera",
      "Vivaldi",
      "DuckDuckGo",
    ],
    description: "Web browsers",
  },
  email: {
    keywords: ["mail", "email", "e-mail", "メール", "이메일", "邮件", "correo", "courrier", "messaging", "メッセージ"],
    commonApps: ["Mail", "Thunderbird", "Spark", "Airmail", "Outlook", "Canary Mail", "MailMate", "Postbox"],
    description: "Email clients",
  },
  imageEdit: {
    keywords: ["photo", "image", "edit", "画像", "写真", "編集", "사진", "图片", "照片", "foto", "imagen", "photoshop"],
    commonApps: ["Adobe Photoshop", "Pixelmator Pro", "Affinity Photo", "GIMP", "Acorn", "Sketch", "Figma", "Canva"],
    description: "Image and photo editors",
  },
  videoEdit: {
    keywords: [
      "video",
      "movie",
      "edit",
      "動画",
      "ビデオ",
      "영상",
      "视频",
      "película",
      "vidéo",
      "film",
      "premiere",
      "final cut",
    ],
    commonApps: [
      "Final Cut Pro",
      "Adobe Premiere Pro",
      "DaVinci Resolve",
      "iMovie",
      "ScreenFlow",
      "Camtasia",
      "HandBrake",
    ],
    description: "Video editors",
  },
  code: {
    keywords: [
      "code",
      "editor",
      "ide",
      "programming",
      "develop",
      "コード",
      "エディタ",
      "開発",
      "코드",
      "编辑器",
      "开发",
      "código",
      "développement",
      "vscode",
      "vim",
    ],
    commonApps: [
      "Visual Studio Code",
      "Xcode",
      "Sublime Text",
      "IntelliJ IDEA",
      "WebStorm",
      "PyCharm",
      "Android Studio",
      "Atom",
      "Nova",
      "BBEdit",
      "Cursor",
      "Zed",
    ],
    description: "Code editors and IDEs",
  },
  terminal: {
    keywords: [
      "terminal",
      "console",
      "command",
      "shell",
      "ターミナル",
      "コンソール",
      "터미널",
      "终端",
      "命令",
      "consola",
      "iterm",
      "warp",
    ],
    commonApps: ["Terminal", "iTerm", "Warp", "Hyper", "Alacritty", "Kitty", "WezTerm"],
    description: "Terminal emulators",
  },
  music: {
    keywords: ["music", "audio", "player", "音楽", "오디오", "音乐", "música", "musique", "spotify", "apple music"],
    commonApps: ["Music", "Spotify", "Apple Music", "VLC", "Audirvana", "Vox", "Swinsian"],
    description: "Music players",
  },
  notes: {
    keywords: ["note", "memo", "markdown", "メモ", "노트", "笔记", "备忘录", "nota", "notion", "obsidian", "bear"],
    commonApps: ["Notes", "Bear", "Notion", "Obsidian", "Evernote", "OneNote", "Typora", "Craft", "Ulysses"],
    description: "Note-taking apps",
  },
  design: {
    keywords: [
      "design",
      "graphic",
      "デザイン",
      "디자인",
      "设计",
      "diseño",
      "conception",
      "figma",
      "sketch",
      "illustrator",
    ],
    commonApps: ["Figma", "Sketch", "Adobe Illustrator", "Affinity Designer", "Canva", "Inkscape"],
    description: "Design tools",
  },
  chat: {
    keywords: ["chat", "message", "チャット", "메시지", "聊天", "mensaje", "slack", "discord", "telegram", "whatsapp"],
    commonApps: ["Slack", "Discord", "Telegram", "WhatsApp", "Messages", "Microsoft Teams", "Zoom"],
    description: "Chat and messaging apps",
  },
  productivity: {
    keywords: [
      "productivity",
      "task",
      "todo",
      "生産性",
      "タスク",
      "생산성",
      "任务",
      "tarea",
      "productivité",
      "things",
      "omnifocus",
    ],
    commonApps: ["Things", "OmniFocus", "Todoist", "TickTick", "Reminders", "Notion", "Trello"],
    description: "Productivity and task management",
  },
  pdf: {
    keywords: ["pdf", "reader", "preview", "PDF", "ピーディーエフ", "阅读", "lector"],
    commonApps: ["Preview", "Adobe Acrobat", "PDF Expert", "Skim", "PDFelement"],
    description: "PDF readers and editors",
  },
  calendar: {
    keywords: ["calendar", "schedule", "カレンダー", "스케줄", "日历", "calendario", "calendrier", "fantastical"],
    commonApps: ["Calendar", "Fantastical", "BusyCal", "Cron", "Amie"],
    description: "Calendar apps",
  },
  fileManager: {
    keywords: [
      "file",
      "finder",
      "manager",
      "ファイル",
      "파일",
      "文件",
      "archivo",
      "fichier",
      "path finder",
      "forklift",
    ],
    commonApps: ["Finder", "Path Finder", "Forklift", "Commander One", "ForkLift"],
    description: "File managers",
  },
  screenshot: {
    keywords: [
      "screenshot",
      "capture",
      "screen",
      "スクリーンショット",
      "스크린샷",
      "截图",
      "captura",
      "cleanshot",
      "snagit",
    ],
    commonApps: ["CleanShot X", "Snagit", "Xnapper", "Screenshot", "Monosnap"],
    description: "Screenshot and screen capture tools",
  },
  password: {
    keywords: [
      "password",
      "vault",
      "パスワード",
      "비밀번호",
      "密码",
      "contraseña",
      "mot de passe",
      "1password",
      "bitwarden",
    ],
    commonApps: ["1Password", "Bitwarden", "LastPass", "Dashlane", "KeePassXC"],
    description: "Password managers",
  },
};

/**
 * Get Google search URL for an app name
 */
export function getSearchUrl(appName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(appName + " mac app")}`;
}

/**
 * Find categories matching keywords
 */
export function findMatchingCategories(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const matches: string[] = [];

  for (const [categoryId, category] of Object.entries(APP_CATEGORIES)) {
    if (category.keywords.some((keyword) => lowerQuery.includes(keyword.toLowerCase()))) {
      matches.push(categoryId);
    }
  }

  return matches;
}

/**
 * Get common apps for matched categories
 */
export function getCommonAppsForQuery(query: string): string[] {
  const categories = findMatchingCategories(query);
  const apps = new Set<string>();

  for (const categoryId of categories) {
    const category = APP_CATEGORIES[categoryId];
    if (category) {
      category.commonApps.forEach((app) => apps.add(app));
    }
  }

  return Array.from(apps);
}
