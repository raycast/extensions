import { List, Action, ActionPanel, Icon, showToast, Toast, getPreferenceValues, Clipboard } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

interface Template {
  id: string;
  name: string;
  description: string;
  icon: Icon;
  keywords: string[];
  sites: string[];
}

const templates: Template[] = [
  {
    id: "crypto",
    name: "Crypto Trading",
    description: "DexScreener, CoinGecko, CoinMarketCap, Twitter",
    icon: Icon.Coins,
    keywords: ["crypto", "bitcoin", "btc", "ethereum", "trading"],
    sites: ["dexscreener.com", "coingecko.com", "coinmarketcap.com", "twitter.com"],
  },
  {
    id: "defi",
    name: "DeFi Research",
    description: "DeFi Llama, Dune Analytics, Etherscan, RugCheck",
    icon: Icon.Shield,
    keywords: ["defi", "degen", "rugcheck", "etherscan", "research"],
    sites: ["defillama.com", "dune.com", "etherscan.io", "rugcheck.xyz"],
  },
  {
    id: "stocks",
    name: "Stock Analysis",
    description: "TradingView, Yahoo Finance, Finviz, MarketWatch",
    icon: Icon.LineChart,
    keywords: ["stocks", "trading", "finance", "market", "investing"],
    sites: ["tradingview.com", "finance.yahoo.com", "finviz.com", "marketwatch.com"],
  },
  {
    id: "ai",
    name: "AI Content Creation",
    description: "ChatGPT, Claude, Canva, YouTube Studio",
    icon: Icon.Stars,
    keywords: ["ai", "content", "chatgpt", "claude", "creator"],
    sites: ["chat.openai.com", "claude.ai", "canva.com", "studio.youtube.com"],
  },
  {
    id: "dev",
    name: "Developer Workflow",
    description: "GitHub, Stack Overflow, MDN, Vercel",
    icon: Icon.Code,
    keywords: ["dev", "developer", "code", "github", "programming"],
    sites: ["github.com", "stackoverflow.com", "developer.mozilla.org", "vercel.com"],
  },
  {
    id: "freelance",
    name: "Freelancer HQ",
    description: "Upwork, Gmail, Stripe, Notion, Calendar",
    icon: Icon.Briefcase,
    keywords: ["freelance", "work", "business", "client", "money"],
    sites: ["upwork.com", "gmail.com", "stripe.com", "notion.so", "calendar.google.com"],
  },
  {
    id: "research",
    name: "Deep Research",
    description: "Google Scholar, Wikipedia, Perplexity, Zotero",
    icon: Icon.MagnifyingGlass,
    keywords: ["research", "study", "academic", "learning", "wiki"],
    sites: ["scholar.google.com", "wikipedia.org", "perplexity.ai", "zotero.org"],
  },
  {
    id: "news",
    name: "News & Media",
    description: "Hacker News, Reddit, TechCrunch, The Verge",
    icon: Icon.Newspaper,
    keywords: ["news", "hn", "reddit", "tech", "media"],
    sites: ["news.ycombinator.com", "reddit.com", "techcrunch.com", "theverge.com"],
  },
];

interface Preferences {
  gridviewPath?: string;
}

function getTemplateRequestPath(): string {
  const gridviewDir = join(homedir(), ".gridview");
  if (!existsSync(gridviewDir)) {
    mkdirSync(gridviewDir, { recursive: true });
  }
  return join(gridviewDir, "template-request.json");
}

async function saveTemplateRequest(template: Template) {
  const requestPath = getTemplateRequestPath();
  const request = {
    timestamp: new Date().toISOString(),
    template: {
      id: template.id,
      name: template.name,
      sites: template.sites,
    },
    source: "raycast",
  };
  writeFileSync(requestPath, JSON.stringify(request, null, 2));
}

async function copySitesToClipboard(sites: string[]) {
  const urls = sites.map((site) => (site.startsWith("http") ? site : `https://${site}`));
  await Clipboard.copy(urls.join("\n"));
}

async function launchGridView(template?: Template) {
  const prefs = getPreferenceValues<Preferences>();
  const appPath = prefs.gridviewPath || "/Applications/GridViewPro.app";

  try {
    // Check if app exists
    await execAsync(`test -d "${appPath}"`);

    // Save template request for future GridView Pro integration
    if (template) {
      await saveTemplateRequest(template);
      await copySitesToClipboard(template.sites);
    }

    // Launch GridView Pro
    await execAsync(`open "${appPath}"`);

    if (template) {
      await showToast({
        style: Toast.Style.Success,
        title: `Opened ${template.name}`,
        message: "Sites copied to clipboard — paste into GridView Pro",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Launched GridView Pro",
      });
    }
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "GridView Pro not found",
      message: "Install from Mac App Store or update path in preferences",
    });
  }
}

export default function Command() {
  return (
    <List searchBarPlaceholder="Search templates (crypto, dev, ai...)">
      <List.Section title="Popular Templates">
        {templates.slice(0, 4).map((template) => (
          <List.Item
            key={template.id}
            icon={template.icon}
            title={template.name}
            subtitle={template.description}
            keywords={template.keywords}
            accessories={[{ icon: Icon.ArrowRight }]}
            actions={
              <ActionPanel>
                <Action title="Open Template" icon={Icon.Window} onAction={() => launchGridView(template)} />
                <Action
                  title="Copy Sites"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={async () => {
                    await copySitesToClipboard(template.sites);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Sites copied",
                      message: `${template.sites.length} URLs ready to paste`,
                    });
                  }}
                />
                <Action
                  title="Launch GridView Pro"
                  icon={Icon.AppWindow}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={() => launchGridView()}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="All Templates">
        {templates.slice(4).map((template) => (
          <List.Item
            key={template.id}
            icon={template.icon}
            title={template.name}
            subtitle={template.description}
            keywords={template.keywords}
            actions={
              <ActionPanel>
                <Action title="Open Template" icon={Icon.Window} onAction={() => launchGridView(template)} />
                <Action
                  title="Copy Sites"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={async () => {
                    await copySitesToClipboard(template.sites);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Sites copied",
                      message: `${template.sites.length} URLs ready`,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
