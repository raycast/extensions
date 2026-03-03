import { OPMLFeed } from "./types";

export function parseOPML(opmlContent: string): OPMLFeed[] {
  const feeds: OPMLFeed[] = [];

  // Simple regex-based parsing (works for most OPML files)
  const outlineRegex = /<outline[^>]*type="rss"[^>]*>/gi;
  let match;

  while ((match = outlineRegex.exec(opmlContent)) !== null) {
    const outline = match[0];

    const titleMatch =
      outline.match(/title="([^"]*)"/i) || outline.match(/text="([^"]*)"/i);
    const urlMatch = outline.match(/xmlUrl="([^"]*)"/i);
    const htmlUrlMatch = outline.match(/htmlUrl="([^"]*)"/i);
    const categoryMatch = outline.match(/category="([^"]*)"/i);

    if (titleMatch && urlMatch) {
      feeds.push({
        title: titleMatch[1],
        url: urlMatch[1],
        htmlUrl: htmlUrlMatch?.[1],
        category: categoryMatch?.[1],
      });
    }
  }

  return feeds;
}

export async function fetchOPMLFromURL(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OPML: ${response.status}`);
  }
  return response.text();
}

export function getBuiltinFeeds(): OPMLFeed[] {
  // Curated list of essential security feeds
  return [
    // Vulnerability Sources
    {
      title: "CISA Alerts",
      url: "https://www.cisa.gov/uscert/ncas/alerts.xml",
      category: "Vulnerability",
    },
    {
      title: "Exploit-DB",
      url: "https://www.exploit-db.com/rss.xml",
      category: "Vulnerability",
    },

    // Threat Intelligence
    {
      title: "Krebs on Security",
      url: "https://krebsonsecurity.com/feed/",
      category: "Intelligence",
    },
    {
      title: "The Hacker News",
      url: "https://feeds.feedburner.com/TheHackersNews",
      category: "News",
    },
    {
      title: "BleepingComputer",
      url: "https://www.bleepingcomputer.com/feed/",
      category: "News",
    },
    {
      title: "Dark Reading",
      url: "https://www.darkreading.com/rss.xml",
      category: "News",
    },

    // Security Research
    {
      title: "Google Project Zero",
      url: "https://googleprojectzero.blogspot.com/feeds/posts/default",
      category: "Intelligence",
    },
    {
      title: "Trail of Bits Blog",
      url: "https://blog.trailofbits.com/feed",
      category: "Intelligence",
    },

    // Vendor Blogs
    {
      title: "Microsoft Security Blog",
      url: "https://www.microsoft.com/security/blog/feed/",
      category: "Intelligence",
    },
    {
      title: "Cloudflare Blog",
      url: "https://blog.cloudflare.com/rss/",
      category: "Intelligence",
    },
    {
      title: "Unit42 (Palo Alto)",
      url: "https://unit42.paloaltonetworks.com/feed/",
      category: "Intelligence",
    },

    // Tools & Resources
    {
      title: "PortSwigger Blog",
      url: "https://portswigger.net/blog/rss",
      category: "News",
    },
    {
      title: "SANS Internet Storm Center",
      url: "https://isc.sans.edu/rssfeed.xml",
      category: "News",
    },
    {
      title: "SecurityWeek",
      url: "https://www.securityweek.com/feed/",
      category: "News",
    },
    {
      title: "Help Net Security",
      url: "https://www.helpnetsecurity.com/feed/",
      category: "News",
    },
  ];
}
