import { ConnectorProvider, GetAgentConfigurationsResponseType, MeResponseType } from "@dust-tt/client";
import { Color, Icon, Image, LocalStorage } from "@raycast/api";
import { jwtDecode } from "jwt-decode";
import { convert as convertHtmlToText } from "html-to-text";
import { marked, Token, Tokens } from "marked";
import Asset = Image.Asset;

export interface AgentType {
  sId: string;
  name: string;
  description: string;
}

export const DUST_AGENT: AgentType = {
  sId: "dust",
  name: "Dust",
  description: "An assistant with context on your company data.",
};

interface ConnectorProviderConfig {
  icon: Asset;
  color: Color;
  name: string;
}
export const ConnectorProviders: Partial<Record<ConnectorProvider, ConnectorProviderConfig>> = {
  github: {
    icon: "icons/github.svg",
    color: Color.PrimaryText,
    name: "GitHub",
  },
  google_drive: {
    icon: "icons/google_drive.svg",
    color: Color.Yellow,
    name: "Google Drive",
  },
  slack: {
    icon: "icons/slack.svg",
    color: Color.Red,
    name: "Slack",
  },
  notion: {
    icon: "icons/notion.svg",
    color: Color.Purple,
    name: "Notion",
  },
  intercom: {
    icon: "icons/intercom.svg",
    color: Color.Blue,
    name: "Intercom",
  },
  confluence: {
    icon: "icons/confluence.svg",
    color: Color.Green,
    name: "Confluence",
  },
  microsoft: {
    icon: "icons/microsoft.svg",
    color: Color.Blue,
    name: "Microsoft",
  },
  snowflake: {
    icon: "icons/snowflake.svg",
    color: Color.Blue,
    name: "Snowflake",
  },
  zendesk: {
    icon: "icons/zendesk.svg",
    color: Color.Orange,
    name: "Zendesk",
  },
  webcrawler: {
    icon: "icons/webcrawler.svg",
    color: Color.Yellow,
    name: "Web Crawler",
  },
  bigquery: {
    icon: "icons/bigquery.svg",
    color: Color.Blue,
    name: "BigQuery",
  },
  salesforce: {
    icon: "icons/salesforce.svg",
    color: Color.Red,
    name: "Salesforce",
  },
  gong: {
    icon: "icons/gong.svg",
    color: Color.Green,
    name: "Gong",
  },
  slack_bot: {
    icon: "icons/slack_bot.svg",
    color: Color.Red,
    name: "Slack Bot",
  },
};

const GREETINGS = [
  "Hey [Name]! 👋",
  "Good to see you, [Name]! 😊",
  "What's up, [Name]? 🙌",
  "How's it going, [Name]? 🚀",
  "Hiya, [Name]! 🌟",
  "Yo [Name]! 😎",
  "Welcome, [Name]! 🎉",
  "Howdy, [Name]! 🤠",
  "Greetings, [Name]! 🌈",
  "Salutations, [Name]! 🎩",
  "What's new, [Name]? 💌",
  "How are you, [Name]? 🤗",
  "Ahoy, [Name]! ⚓",
  "Bonjour, [Name]! 🥖",
  "Hola, [Name]! 🌮",
  "Ciao, [Name]! 🍕",
  "Namaste, [Name]! 🕉",
  "Konnichiwa, [Name]! 🎌",
  "Aloha, [Name]! 🌺",
  "Hey there, [Name]! 💡",
  "How's everything, [Name]? 📈",
  "Good day, [Name]! 🌞",
  "Welcome back, [Name]! 🔄",
  "Long time no see, [Name]! ⏰",
  "Great to meet you, [Name]! 🤝",
  "Pleased to see you, [Name]! 😁",
  "Cheers, [Name]! 🥂",
  "Top of the morning, [Name]! 🍀",
  "Happy to chat, [Name]! 💬",
  "What's happening, [Name]? 🎈",
  "How's life treating you, [Name]? 🎠",
  "Missed you, [Name]! 💔",
  "Glad you're here, [Name]! 📍",
  "Smile, [Name]! 😄",
  "Lookin' good, [Name]! 👍",
  "What's cooking, [Name]? 🍳",
  "How's the family, [Name]? 👨‍👩‍👧‍👦",
  "Stay cool, [Name]! ❄️",
  "Keep shining, [Name]! 💎",
  "You're a star, [Name]! ⭐",
  "Rise and shine, [Name]! 🌅",
  "Keep it up, [Name]! 💪",
  "Rock on, [Name]! 🤘",
];

export type UserType = MeResponseType["user"];
export type AgentConfigurationType = GetAgentConfigurationsResponseType["agentConfigurations"][0];

export function getRandomGreetingForName(firstName: string) {
  const randomIndex = Math.floor(Math.random() * GREETINGS.length);
  return GREETINGS[randomIndex].replace("[Name]", firstName);
}

export function getAgentScopeConfig(scope: AgentConfigurationType["scope"]) {
  switch (scope) {
    case "global":
      return { label: "Global", icon: Icon.Globe, color: Color.SecondaryText };
    case "private":
      return { label: "Personal", icon: Icon.Lock, color: Color.Blue };
    case "workspace":
      return { label: "Company", icon: Icon.Building, color: Color.Yellow };
    case "published":
      return { label: "Shared", icon: Icon.AddPerson, color: Color.Magenta };
    default:
      return { label: scope, icon: Icon.QuestionMark, color: Color.Red };
  }
}

export async function setUser(user: UserType) {
  await LocalStorage.setItem("user", JSON.stringify(user));
}

export async function getUser(): Promise<UserType | undefined> {
  const user = await LocalStorage.getItem<string>("user");
  if (!user) {
    return undefined;
  }
  return JSON.parse(user);
}

export async function setWorkspaceId(workspaceId: string) {
  await LocalStorage.setItem("workspaceId", workspaceId);
}

export async function getWorkspaceId(): Promise<string | undefined> {
  return await LocalStorage.getItem("workspaceId");
}

function renderTokensPlain(tokens: Token[]): string {
  return tokens.map(renderTokenPlain).join("");
}

// Prefer parsed children (respects escapes and nested emphasis/links) over the raw text.
function renderInlinePlain(token: { text?: string; tokens?: Token[]; raw?: string }): string {
  if (token.tokens) {
    return renderTokensPlain(token.tokens);
  }
  return token.text ?? token.raw ?? "";
}

function renderTokenPlain(token: Token): string {
  switch (token.type) {
    case "text":
    case "escape":
    case "codespan":
    case "strong":
    case "em":
    case "del":
    case "link":
    case "image":
    case "blockquote":
      return renderInlinePlain(token);
    case "heading":
    case "paragraph":
    case "code":
      return `${renderInlinePlain(token)}\n\n`;
    case "list": {
      const list = token as Tokens.List;
      return list.items.map((item) => `${renderTokenPlain(item)}\n`).join("") + "\n";
    }
    case "list_item":
      // "\n", not "": an item's text and a nested block (e.g. a sub-list) are siblings with no boundary otherwise.
      return (token as Tokens.ListItem).tokens.map(renderTokenPlain).join("\n");
    case "table": {
      const table = token as Tokens.Table;
      const rows = [table.header, ...table.rows];
      return rows.map((row) => row.map((cell) => renderTokensPlain(cell.tokens)).join(" | ")).join("\n") + "\n\n";
    }
    case "br":
    case "hr":
      return "\n";
    case "space":
    case "def":
      return "";
    case "html": {
      const rendered = convertHtmlToText(renderInlinePlain(token), {
        selectors: [{ selector: "img", format: "skip" }],
      });
      // Block html (e.g. <div>) needs a boundary; inline html (e.g. <sup> around a citation) must stay glued to its text.
      return (token as Tokens.HTML).block ? `${rendered}\n\n` : rendered;
    }
    default:
      return "raw" in token ? String(token.raw) : "";
  }
}

// Slack's lone ">>>" line ("quote everything below") makes marked recurse on the extra ">"s and drop the quoted lines.
function normalizeSlackBlockquotes(text: string): string {
  return text.replace(/^>>>[ \t]*$/gm, ">");
}

export function stripMarkdown(text: string): string {
  return renderTokensPlain(marked.lexer(normalizeSlackBlockquotes(text)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractAndStoreRegion(token: string) {
  try {
    const decoded = jwtDecode<{ [key: string]: string }>(token);
    const region = decoded["https://dust.tt/region"];
    if (region) {
      await LocalStorage.setItem("selectedRegion", region);
      return region;
    }
  } catch (error) {
    console.error("Failed to decode JWT or extract region:", error);
  }
  return null;
}
