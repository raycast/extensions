import { List, Action, ActionPanel, Icon, showToast, Toast, getPreferenceValues, Clipboard } from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function copySitesToClipboard(sites: string[]) {
  const urls = sites.map((site) => (site.startsWith("http") ? site : `https://${site}`));
  await Clipboard.copy(urls.join("\n"));
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: Icon;
  keywords: string[];
  url?: string;
  sites?: string[];
}

const quickActions: QuickAction[] = [
  // Crypto
  {
    id: "btc",
    title: "Bitcoin Research",
    subtitle: "BTC price, charts, news",
    icon: Icon.Coins,
    keywords: ["btc", "bitcoin", "crypto"],
    sites: [
      "coinmarketcap.com/currencies/bitcoin",
      "tradingview.com/symbols/BTCUSDT",
      "coingecko.com/en/coins/bitcoin",
    ],
  },
  {
    id: "eth",
    title: "Ethereum Research",
    subtitle: "ETH price, charts, news",
    icon: Icon.Coins,
    keywords: ["eth", "ethereum", "crypto"],
    sites: ["coinmarketcap.com/currencies/ethereum", "etherscan.io", "coingecko.com/en/coins/ethereum"],
  },
  {
    id: "sol",
    title: "Solana Research",
    subtitle: "SOL price, ecosystem",
    icon: Icon.Coins,
    keywords: ["sol", "solana", "crypto"],
    sites: ["coinmarketcap.com/currencies/solana", "solscan.io", "dexscreener.com/solana"],
  },

  // Stocks
  {
    id: "aapl",
    title: "Apple (AAPL)",
    subtitle: "Stock analysis",
    icon: Icon.LineChart,
    keywords: ["aapl", "apple", "stock"],
    sites: ["finance.yahoo.com/quote/AAPL", "tradingview.com/symbols/NASDAQ-AAPL", "finviz.com/quote.ashx?t=AAPL"],
  },
  {
    id: "nvda",
    title: "NVIDIA (NVDA)",
    subtitle: "Stock analysis",
    icon: Icon.LineChart,
    keywords: ["nvda", "nvidia", "stock"],
    sites: ["finance.yahoo.com/quote/NVDA", "tradingview.com/symbols/NASDAQ-NVDA", "finviz.com/quote.ashx?t=NVDA"],
  },
  {
    id: "meta",
    title: "Meta (META)",
    subtitle: "Stock analysis",
    icon: Icon.LineChart,
    keywords: ["meta", "facebook", "stock"],
    sites: ["finance.yahoo.com/quote/META", "tradingview.com/symbols/NASDAQ-META", "finviz.com/quote.ashx?t=META"],
  },

  // Research
  {
    id: "hn",
    title: "Hacker News",
    subtitle: "Tech news and discussions",
    icon: Icon.Book,
    keywords: ["hn", "hackernews", "tech"],
    url: "https://news.ycombinator.com",
  },
  {
    id: "reddit",
    title: "Reddit",
    subtitle: "Community discussions",
    icon: Icon.SpeechBubble,
    keywords: ["reddit", "community", "discussion"],
    url: "https://reddit.com",
  },
  {
    id: "twitter",
    title: "X / Twitter",
    subtitle: "Social media",
    icon: Icon.Bird,
    keywords: ["twitter", "x", "social"],
    url: "https://twitter.com",
  },

  // AI Tools
  {
    id: "chatgpt",
    title: "ChatGPT",
    subtitle: "OpenAI chat",
    icon: Icon.Stars,
    keywords: ["chatgpt", "gpt", "ai"],
    url: "https://chat.openai.com",
  },
  {
    id: "claude",
    title: "Claude",
    subtitle: "Anthropic AI",
    icon: Icon.Stars,
    keywords: ["claude", "anthropic", "ai"],
    url: "https://claude.ai",
  },
  {
    id: "perplexity",
    title: "Perplexity",
    subtitle: "AI search",
    icon: Icon.MagnifyingGlass,
    keywords: ["perplexity", "search", "ai"],
    url: "https://perplexity.ai",
  },

  // Dev Tools
  {
    id: "github",
    title: "GitHub",
    subtitle: "Code repository",
    icon: Icon.Code,
    keywords: ["github", "code", "git"],
    url: "https://github.com",
  },
  {
    id: "stackoverflow",
    title: "Stack Overflow",
    subtitle: "Developer Q&A",
    icon: Icon.QuestionMark,
    keywords: ["stackoverflow", "coding", "help"],
    url: "https://stackoverflow.com",
  },
  {
    id: "vercel",
    title: "Vercel",
    subtitle: "Deployment platform",
    icon: Icon.Upload,
    keywords: ["vercel", "deploy", "hosting"],
    url: "https://vercel.com",
  },

  // Communication
  {
    id: "gmail",
    title: "Gmail",
    subtitle: "Email",
    icon: Icon.Envelope,
    keywords: ["gmail", "email", "mail"],
    url: "https://gmail.com",
  },
  {
    id: "calendar",
    title: "Google Calendar",
    subtitle: "Schedule",
    icon: Icon.Calendar,
    keywords: ["calendar", "schedule", "meetings"],
    url: "https://calendar.google.com",
  },
  {
    id: "notion",
    title: "Notion",
    subtitle: "Notes & docs",
    icon: Icon.Document,
    keywords: ["notion", "notes", "docs"],
    url: "https://notion.so",
  },
  {
    id: "slack",
    title: "Slack",
    subtitle: "Team chat",
    icon: Icon.SpeechBubble,
    keywords: ["slack", "chat", "team"],
    url: "https://slack.com",
  },
];

async function launchInGridView(action: QuickAction) {
  const prefs = getPreferenceValues();
  const appPath = prefs.gridviewPath || "/Applications/GridViewPro.app";

  try {
    await execAsync(`test -d "${appPath}"`);

    const sites = action.sites || (action.url ? [action.url.replace("https://", "")] : []);

    // Copy sites to clipboard for easy pasting
    if (sites.length > 0) {
      await copySitesToClipboard(sites);
    }

    // Launch app
    await execAsync(`open "${appPath}"`);

    await showToast({
      style: Toast.Style.Success,
      title: `Opening ${action.title}`,
      message: sites.length > 0 ? "Sites copied to clipboard" : "GridView Pro launched",
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "GridView Pro not found",
      message: "Install from Mac App Store or update path in preferences",
    });
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  // Filter actions based on search
  const filteredActions = searchText
    ? quickActions.filter(
        (action) =>
          action.title.toLowerCase().includes(searchText.toLowerCase()) ||
          action.subtitle.toLowerCase().includes(searchText.toLowerCase()) ||
          action.keywords.some((k) => k.toLowerCase().includes(searchText.toLowerCase())),
      )
    : quickActions;

  // Group by category logic (simplified)
  const crypto = filteredActions.filter((a) => ["btc", "eth", "sol"].includes(a.id));
  const stocks = filteredActions.filter((a) => ["aapl", "nvda", "meta"].includes(a.id));
  const tools = filteredActions.filter((a) => !["btc", "eth", "sol", "aapl", "nvda", "meta"].includes(a.id));

  return (
    <List
      searchBarPlaceholder="Type a ticker, crypto, or site (e.g., BTC, AAPL, GPT...)"
      onSearchTextChange={setSearchText}
    >
      {crypto.length > 0 && (
        <List.Section title="Crypto Research" subtitle="Instant multi-panel crypto analysis">
          {crypto.map((action) => (
            <List.Item
              key={action.id}
              icon={action.icon}
              title={action.title}
              subtitle={action.subtitle}
              keywords={action.keywords}
              actions={
                <ActionPanel>
                  <Action title="Open in GridView Pro" icon={Icon.Window} onAction={() => launchInGridView(action)} />
                  {action.url && (
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={action.url}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {stocks.length > 0 && (
        <List.Section title="Stock Analysis" subtitle="Financial research panels">
          {stocks.map((action) => (
            <List.Item
              key={action.id}
              icon={action.icon}
              title={action.title}
              subtitle={action.subtitle}
              keywords={action.keywords}
              actions={
                <ActionPanel>
                  <Action title="Open in GridView Pro" icon={Icon.Window} onAction={() => launchInGridView(action)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {tools.length > 0 && (
        <List.Section title="Tools & Sites" subtitle="Quick access to your tools">
          {tools.map((action) => (
            <List.Item
              key={action.id}
              icon={action.icon}
              title={action.title}
              subtitle={action.subtitle}
              keywords={action.keywords}
              actions={
                <ActionPanel>
                  <Action title="Open in GridView Pro" icon={Icon.Window} onAction={() => launchInGridView(action)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {filteredActions.length === 0 && searchText && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No quick actions found"
          description={`Try searching for BTC, AAPL, GPT, dev, stock, etc.`}
        />
      )}
    </List>
  );
}
