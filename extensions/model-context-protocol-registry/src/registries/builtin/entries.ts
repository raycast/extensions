import { homedir } from "os";
import { join } from "path";
import { Color, Icon } from "@raycast/api";
import type { RegistryEntry } from "./types";

const METABRAIN_DB_PATH = join(homedir(), ".metabrain.db");

export const OFFICIAL_ENTRIES: RegistryEntry[] = [
  {
    name: "wine-labs",
    title: "Wine Labs",
    description:
      "Fine-wine matching, market pricing, auctions, merchant offers and portfolio intelligence. Hosted Streamable HTTP server with browser OAuth; account plans or credits apply. Public connection documentation is MIT licensed; the hosted implementation and data are proprietary.",
    icon: "https://winelabs.ai/apple-touch-icon.png",
    homepage: "https://winelabs.ai/agents",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://chat.wine-labs.com/mcp"],
    },
    remoteUrl: "https://chat.wine-labs.com/mcp",
  },
  {
    name: "rentreboot",
    title: "RentReboot",
    description:
      "NYC apartment search, renter guides and rent data. Public tools work without an account; personal alerts, saved searches and housing lottery status use scoped OAuth. Website alert plans are separate. Public connection documentation is MIT licensed; the hosted implementation is proprietary.",
    icon: "https://rentreboot.com/favicon-256x256.png",
    homepage: "https://rentreboot.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://rentreboot.com/api/mcp"],
    },
    remoteUrl: "https://rentreboot.com/api/mcp",
  },
  {
    name: "pennyocr",
    title: "PennyOCR",
    description:
      "Read PDFs and images as Markdown or text, estimate costs, check credits and enforce per-request spend caps. MIT server. Processing requires your own PennyOCR API key and credits. Replace YOUR_PENNYOCR_API_KEY in PENNYOCR_AUTH_HEADER; keep the Bearer prefix.",
    icon: "https://pennyocr.com/icon.svg?icon.33yg1dkff50x-.svg",
    homepage: "https://pennyocr.com/mcp/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.pennyocr.com", "--header", "Authorization:${PENNYOCR_AUTH_HEADER}"],
      env: {
        PENNYOCR_AUTH_HEADER: "Bearer YOUR_PENNYOCR_API_KEY",
      },
    },
  },
  {
    name: "blindpay",
    title: "BlindPay",
    description:
      "Stablecoin API for global payments. Create receivers and virtual accounts, get FX quotes, run payouts and payins across bank rails and blockchains, and read balances and transaction history. Remote Streamable HTTP server with BlindPay OAuth 2.1 sign-in through `mcp-remote`; no API key needed.",
    icon: "https://github.com/blindpaylabs.png",
    homepage: "https://github.com/blindpaylabs/blindpay-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.blindpay.com/mcp"],
    },
  },
  {
    name: "3dsellers",
    title: "3Dsellers",
    description:
      "Run eBay, Amazon, Walmart, Etsy, Shopify and TikTok Shop stores from your AI assistant. Search and create products, publish listings, update inventory and prices, manage orders, run bulk edits and CSV imports, and answer buyer messages through your 3Dsellers account. 150+ tools. Hosted remote Streamable HTTP server; OAuth 2.0 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/3dsellers/ebay-mcp-server/main/assets/logo.png",
    homepage: "https://www.3dsellers.com/channel-integration/3dsellers-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.3dsellers.com/mcp"],
    },
    remoteUrl: "https://api.3dsellers.com/mcp",
  },
  {
    name: "60fps",
    title: "60fps",
    description:
      "Real iOS interactions from shipping apps, with the motion breakdown and SwiftUI to build them. Search 2,000+ interactions in plain language, read the motion anatomy behind each one (trigger, timing, easing, spring) and get starter SwiftUI tuned to the real timing. Read-only. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and a paid 60fps MCP licence, no API key to paste.",
    icon: "https://raw.githubusercontent.com/60fps-Design/plugin/main/assets/logo.png",
    homepage: "https://60fps.design/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.60fps.design/mcp"],
    },
  },
  {
    name: "a1-gallery",
    title: "A1 Gallery",
    description:
      "Hand-curated web design references, inside your agent. Search 1,100+ real websites, their captured sections and interior pages, the fonts they use and the designers who made them, and read design tokens measured off each rendered page: type sizes, spacing, radius, container width and palette. 17 read-only tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, free A1 account (50 calls a day), no API key to paste.",
    icon: "https://img.a1.gallery/brand/a1-app-icon-512.png",
    homepage: "https://www.a1.gallery/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://www.a1.gallery/api/mcp"],
    },
    remoteUrl: "https://www.a1.gallery/api/mcp",
  },
  {
    name: "affixio",
    title: "AffixIO",
    description:
      "Generate and verify zero-knowledge proofs with post-quantum ML-DSA-65 attestations for AI agents, without exposing personal data. 102 tools covering circuit proving and verification, signed attestation and token checks, delegation, and Merkle audit proofs. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, where you choose one of your AffixIO keys on the consent screen, so there is no API key to paste into the client.",
    icon: "https://www.affix-io.com/logo.png",
    homepage: "https://www.affix-io.com/mcp/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://www.affix-io.com/mcp/"],
    },
    remoteUrl: "https://www.affix-io.com/mcp/",
  },
  {
    name: "aggregate",
    title: "Aggregate",
    description:
      "Every company's money in one ledger: cash, burn, runway, receivables, recurring spend, payroll and month-end close, from banks and cards (Plaid, Mercury, Brex, Ramp, Wise), payments (Stripe, Square, Shopify), QuickBooks, Xero and payroll. Read-only to banks, Stripe and other providers; it can't move money. AI writes (cash sales, paper bills, corrections) are labeled and undoable for 30 days, and closing books always waits for a person. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, you choose which companies and data each connection sees, no API key to paste. Open-sourcing (AGPL) at launch.",
    icon: "https://app.aggregate.finance/icon-512.png",
    homepage: "https://aggregate.finance",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.aggregate.finance/mcp"],
    },
    remoteUrl: "https://app.aggregate.finance/mcp",
  },
  {
    name: "getmattered",
    title: "GetMattered",
    description:
      "Auto-Apply That Ends on an Interview. Search jobs matched to your resume, then apply from Raycast: GetMattered rewrites your resume for the posting, writes the cover letter and submits the application on the employer's own hiring system. Works with 34 hiring systems, including Workday, Greenhouse, Lever and Ashby. Also scores your resume against any job and preps you for the interview. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://getmattered.com/apple-touch-icon.png",
    homepage: "https://getmattered.com/mcps?source=raycast-mcp-registry",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.getmattered.com/mcp"],
    },
  },
  {
    name: "airport-lounge-list",
    title: "Airport Lounge List",
    description:
      "Search 8,500+ airport lounges and check access by card, membership or status. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/Airport-Lounge-List/mcp-server/HEAD/plugins/airport-lounge-list/assets/logo.png",
    homepage: "https://airportloungelist.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.airportloungelist.com/mcp"],
    },
  },
  {
    name: "apmzoom",
    title: "apMZoomAI · Dongdaemun Wholesale",
    description:
      "Search wholesale fashion items listed by stalls in the Dongdaemun market in Seoul, see new arrivals, find stalls by building, floor and stall number, and open each item or stall on apMZoomAI, in eight languages. Read-only; never returns prices or merchant contact details. Hosted remote Streamable HTTP server at https://www.apmzoom.com/mcp through `mcp-remote`; no sign-in and no API key.",
    icon: "https://www.apmzoom.com/pwa-icon-192.png",
    homepage: "https://github.com/apmleokeo-gif/apmzoom-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://www.apmzoom.com/mcp"],
    },
  },
  {
    name: "atono",
    title: "Atono",
    description:
      "AI-powered project management for product teams. Connect your AI assistant to Atono's workflow platform to create and update stories, track bugs, manage team assignments, and document fixes—all through natural language commands.",
    icon: {
      source: {
        light: "https://atono-test.directus.app/assets/feaa7f21-4bbe-4164-b725-ff2729725cbf",
        dark: "https://atono-test.directus.app/assets/869c76cd-bb5f-459c-88d1-2315a7b8a545",
      },
    },
    homepage: "https://docs.atono.io/docs/mcp-server-for-atono/",
    configuration: {
      command: "docker",
      args: ["run", "-i", "--rm", "-e", "X_API_KEY", "atonoai/atono-mcp-server"],
      env: {
        X_API_KEY: "<YOUR_API_KEY_HERE>",
      },
    },
  },
  {
    name: "ausca",
    title: "Ausca",
    description:
      "Discover priced OCR, document analysis, transcription, browser and receive-only inbox services, then inspect an offer before invoking it. Public discovery needs no account or API key. This Raycast connection supports offer discovery. Paid calls require USDC on Base through an x402-capable client. Hosted remote Streamable HTTP MCP server.",
    icon: "https://raw.githubusercontent.com/auscahq/ausca-plugin/main/assets/marketplace-icon.svg",
    homepage: "https://ausca.com/docs/mcp/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://ausca.com/mcp"],
    },
    remoteUrl: "https://ausca.com/mcp",
  },
  {
    name: "award-travel-finder",
    title: "Award Travel Finder",
    description:
      "Search award flight availability across 28 airlines and award-chart pricing for 23 loyalty programs. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/AwardTravelFinder/mcp/HEAD/logo.png",
    homepage: "https://awardtravelfinder.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.awardtravelfinder.com/mcp"],
    },
  },
  {
    name: "backlink-guard",
    title: "backlink-guard",
    description:
      "Check a link source (directory, awesome list, guest-post site) before you submit your site to it: each site gets an action (skip, look first, free only, low value or submit) and a verdict with the evidence, against Google's link spam policies. It also verifies a listing once it is live (followed or not, and where the link sits), audits your own backlinks, and finds the pages that rank for your keywords, the sites linking to your competitors and not to you, and who Google's AI Overviews and AI assistants cite. It never submits anything. Ten tools: verify, submissions and vet with free=True are free; the others buy data (vet about $0.01 a site plus $0.16 a batch). Local stdio server `backlink-guard` (MIT) from PyPI through `uvx`; every key is optional: GLASSER_API_KEY (or AISA_API_KEY, which questions and asked need) and GOANYAPI_API_KEY, so remove the ones you do not use.",
    icon: "https://raw.githubusercontent.com/zhuyansen/backlink-guard/main/.claude-plugin/icon.png",
    homepage: "https://github.com/zhuyansen/backlink-guard",
    configuration: {
      command: "uvx",
      args: ["--with", "mcp", "backlink-guard", "mcp"],
      env: {
        GLASSER_API_KEY: "YOUR_API_KEY_HERE",
        GOANYAPI_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "better-design",
    title: "Better Design",
    description:
      "Design systems, UI and UX principles, icons and UI review for AI coding agents. Find or create a design system that fits your product, install its components, and review finished screens for hard-to-read text, hard-to-find buttons and unclear copy. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, free Better Design account, no API key to paste.",
    icon: "https://better-design.com/icon",
    homepage: "https://better-design.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://better-design.com/api/mcp"],
    },
  },
  {
    name: "blawgy",
    title: "Blawgy",
    description:
      "Run your SEO blog from Raycast. Read Search Console traffic, rankings and indexing, run keyword research, manage the content plan, write, update and publish articles to WordPress, Shopify, Webflow, Wix, Framer, Ghost or Duda. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, or an API key. Paid Blawgy plan required.",
    icon: "https://blawgy.com/favicon-512.png",
    homepage: "https://blawgy.com/mcp",
    remoteUrl: "https://app.blawgy.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.blawgy.com/mcp"],
    },
  },
  {
    name: "boim",
    title: "BOIM (보임)",
    description:
      "Korean business directory for AI agents: find businesses across all industries in Korea (2.7M) by region and industry, public-procurement vendor cards (75,000+) built from Public Procurement Service data, and open public bids from KONEPS, Defense e-Procurement, LH, K-water and Nuri-jangteo. Read-only. Remote Streamable HTTP server at https://boim.io/api/mcp; no sign-in and no API key for the free tier, which shows up to 5 results per tool plus a link to the full public list.",
    icon: "https://raw.githubusercontent.com/kikiyop1101/boim-mcp/main/assets/logo.png",
    homepage: "https://github.com/kikiyop1101/boim-mcp",
    remoteUrl: "https://boim.io/api/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://boim.io/api/mcp"],
    },
  },
  {
    name: "bool",
    title: "Bool",
    description:
      "Make your own apps and tools from a conversation. Create Bool projects, prompt Bool's builder or edit files directly, define data entities and records, then publish working web apps to a live URL. Start from templates, remix projects and organize them across workspaces. Writes act only on your own Bool account, including creating, publishing and deleting projects. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, free Bool account, no API key to paste.",
    icon: "https://bool.com/bool-mark.png",
    homepage: "https://bool.com/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://bool.com/api/mcp"],
    },
    remoteUrl: "https://bool.com/api/mcp",
  },
  {
    name: "brave-search",
    title: "Brave Search",
    description:
      "A Model Context Protocol server for Brave Search. This server provides tools to read, search, and manipulate Brave Search repositories via Large Language Models.",
    icon: "https://svgl.app/library/brave.svg",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/HEAD/src/brave-search",
    configuration: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-brave-search"],
      env: {
        BRAVE_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "bulkpublish",
    title: "BulkPublish",
    description:
      "Schedule, cross-post and analyze social media posts across 15 platforms: Facebook, Instagram, X, TikTok, YouTube, Threads, Bluesky, Pinterest, Google Business Profile, LinkedIn, Mastodon, Discord, Telegram, Tumblr and Snapchat. List channels, draft posts with per-platform captions, upload images and video, schedule or take the next queue slot, publish and retry, read post metrics and analytics, and on Pro and Business plans answer DMs and comments. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, pasting a BulkPublish API key once on the consent screen; free plan available.",
    icon: "https://www.bulkpublish.com/favicon.svg",
    homepage: "https://www.bulkpublish.com/integrations/mcp-server/",
    remoteUrl: "https://mcp.bulkpublish.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.bulkpublish.com/mcp"],
    },
  },
  {
    name: "buy-box",
    title: "Buy-Box",
    description:
      "Save your buying criteria for homes, cars or any other category (budget, must-haves, nice-to-haves, dealbreakers) so your AI agent loads them before it searches. Score and rank up to 100 listings at a time against a saved buy box, with rule breakers sorted last and unstated facts marked unknown, and export a box as Markdown. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with Google and dynamic client registration, no API key to paste; free during early access.",
    icon: "https://buybox.agentconsult.ai/icon.png",
    homepage: "https://buybox.agentconsult.ai",
    remoteUrl: "https://buybox.agentconsult.ai/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://buybox.agentconsult.ai/mcp"],
    },
  },
  {
    name: "candor-finance",
    title: "Candor Finance",
    description:
      "Reach your money goals with the AI agent you already use. Tell it what you want, like paying off the cards, buying the house or working four days a week, even if you haven't worked it out yet. With Candor, it breaks that into steps and sets up the plan from your real US bank, card and investment accounts: goals with a measure and a pace, a budget that pays for them, every charge sorted to match. Then it keeps you on it. Every week Candor reviews your whole financial life, from everyday spending to investments, and everything you and your agent have saved, and tells your agent what's worth talking through and why. Every figure comes from your records, and the plan, decisions and reasons stay saved when you switch agents. Read-only: Candor never moves money. Hosted remote personal finance MCP server over Streamable HTTP; OAuth 2.1 sign-in with dynamic client registration, no API key to paste. Paid Candor plan with a 7-day free trial.",
    icon: "https://candor.money/social/candor-facebook-logo.png",
    homepage: "https://candor.money/mcp?utm_source=raycast&utm_medium=mcp-registry",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.candor.money/mcp"],
    },
    remoteUrl: "https://api.candor.money/mcp",
  },
  {
    name: "chirpie",
    title: "Chirpie",
    description:
      "The publishing connector for AI agents: post, thread and schedule to X, Bluesky, LinkedIn, Mastodon and Telegram, attach images and video, save drafts, read post analytics and answer comments. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste; free plan available.",
    icon: "https://chirpie.ai/images/brand/icon@2x.png",
    homepage: "https://chirpie.ai/docs/mcp?source=raycast-mcp-registry",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://chirpie.ai/mcp"],
    },
  },
  {
    name: "chord",
    title: "Chord",
    description:
      "DEX swap quotes and unsigned transactions on 7 EVM chains (Monad, Base, BNB Chain, Avalanche, Arbitrum, Robinhood Chain and Arc), plus token boards, token search, recent trades, candles, wallet PnL and smart money from Chord's own index of on-chain trades, with holders and LP pools on the chains that keep them and Solana for market data. Non-custodial: the swap tool returns an unsigned transaction with the approval it needs and a simulation run as your wallet, and your own wallet signs and sends it. Hosted remote Streamable HTTP server at https://api.getchord.xyz/v1/mcp; no sign-in and no API key for the data and swap tools, only the optional analyst tool needs a Chord API key.",
    icon: "https://getchord.xyz/chord/pwa-512x512.png",
    homepage: "https://getchord.xyz",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.getchord.xyz/v1/mcp"],
    },
    remoteUrl: "https://api.getchord.xyz/v1/mcp",
  },
  {
    name: "chroma",
    title: "Chroma",
    description:
      "This server provides data retrieval capabilities powered by Chroma, enabling AI models to create collections over generated data and user inputs, and retrieve that data using vector search, full text search, metadata filtering, and more.",
    icon: "chroma.png",
    homepage: "https://github.com/chroma-core/chroma-mcp",
    configuration: {
      command: "uvx",
      args: [
        "chroma-mcp",
        "--client-type",
        "cloud",
        "--tenant",
        "YOUR_TENANT_ID_HERE",
        "--database",
        "YOUR_DATABASE_NAME_HERE",
        "--api-key",
        "YOUR_API_KEY_HERE",
      ],
    },
  },
  {
    name: "circleback",
    title: "Circleback",
    description:
      "Circleback's Model Context Protocol (MCP) server provides AI agents access to your Circleback data. It has tools available for searching and accessing meetings, transcripts, calendar events, emails, people, companies, and more.",
    icon: "circleback.svg",
    homepage: "https://circleback.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://circleback.ai/api/mcp"],
    },
  },
  {
    name: "clera",
    title: "Clera",
    description:
      "Hire from Raycast: search 210,000+ vetted startup candidates who opted in to hearing about roles, review the people Clera already picked for your open roles, and request intros. Candidates search open startup jobs, read full listings and save the good ones. Hosted remote server with OAuth 2.1 sign-in (dynamic client registration), no API key to paste; free during the beta.",
    icon: "https://www.getclera.com/images/icon-512x512.png",
    homepage: "https://www.getclera.com/mcp?source=raycast-mcp-registry",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.getclera.com"],
    },
  },
  {
    name: "clipwright",
    title: "Clipwright",
    description:
      "Make UGC-style video ads without filming: tell your assistant what to say and get a vertical clip of a realistic actor saying it, ready for TikTok, Reels or Shorts. It also makes faceless videos from a script or a short brief, and shows the price before anything renders. Local stdio server through `npx`; needs a Clipwright API key.",
    icon: "https://clipwright.io/brand/clipwright-400.png",
    homepage: "https://github.com/seocombat/clipwright-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "-p", "@clipwright/mcp-server", "clipwright-mcp"],
      env: {
        CLIPWRIGHT_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "codetrendy",
    title: "CodeTrendy",
    description:
      "Search CodeTrendy, a curated directory of newly launched startups, SaaS products and AI tools: keyword search with category and pricing filters, full listing profiles, alternatives to a named product, categories, trending and the site of the day. 7 read-only tools. Remote Streamable HTTP server at https://codetrendy.com/api/mcp; no sign-in, no API key.",
    icon: "https://codetrendy.com/android-icon-192x192.png",
    homepage: "https://codetrendy.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://codetrendy.com/api/mcp"],
    },
    remoteUrl: "https://codetrendy.com/api/mcp",
  },
  {
    name: "codex-reset",
    title: "Codex Reset",
    description:
      "Ask whether OpenAI Codex usage limits are likely to reset: the reset probability for the next 24 and 48 hours, the dated record of verified resets with source links, and Codex service status to tell an outage from a usage limit. Read-only remote Streamable HTTP server at https://codex-reset.com/mcp through `mcp-remote`; no sign-in, no API key.",
    icon: "https://codex-reset.com/icon-512.png",
    homepage: "https://codex-reset.com/developers",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://codex-reset.com/mcp"],
    },
  },
  {
    name: "context-7",
    title: "Context 7",
    description:
      "Context7 MCP pulls up-to-date, version-specific documentation and code examples straight from the source — and places them directly into your prompt.",
    icon: {
      source: "context-7.svg",
      tintColor: Color.PrimaryText,
    },
    homepage: "https://github.com/upstash/context7",
    configuration: {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    },
  },
  {
    name: "crevio",
    title: "Crevio",
    description:
      "Delegate work to an AI agent that runs your small business (products, orders, customers, email, sites), or run scripts against the Crevio API and 3,000+ connected apps. 20 tools, including starting and following agent runs, approving gated actions and reading the audit log. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, no API key to paste; works on the free plan, or use an API token on the Business plan.",
    icon: "https://crevio.co/icon-512.png",
    homepage: "https://crevio.co/docs/developer/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.crevio.co/mcp"],
    },
    remoteUrl: "https://mcp.crevio.co/mcp",
  },
  {
    name: "csolar-energia",
    title: "CSolar Energia",
    description:
      "Solar power estimates for homes and businesses in São Paulo state, Brazil, from CSolar Energia, a solar installer. From the monthly electricity bill in reais or the consumption in kWh, get the number of 630 W panels, installed power, monthly generation, estimated installed price, monthly savings and payback, and check whether CSolar serves a city (all 645 municipalities of São Paulo state). Estimates, not quotes; answers in Portuguese. Read-only, no personal data. Remote Streamable HTTP server at https://csolar.com.br/mcp; no sign-in, no API key.",
    icon: "https://csolar.com.br/favicon.png",
    homepage: "https://csolar.com.br/para-agentes#mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://csolar.com.br/mcp"],
    },
    remoteUrl: "https://csolar.com.br/mcp",
  },
  {
    name: "datacircle",
    title: "Datacircle",
    description:
      "Datacircle lists all the GTM APIs. Our MCP server is open to anyone, with no key: add api.datacircle.dev/mcp to Claude, ChatGPT or Cursor.",
    icon: "https://datacircle.dev/favicon.png",
    homepage: "https://datacircle.dev/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.datacircle.dev/mcp"],
    },
    remoteUrl: "https://api.datacircle.dev/mcp",
  },
  {
    name: "databricks-field-guide",
    title: "Databricks Field Guide",
    description:
      "Databricks answers with working code, from TechFabric's engineers. Search and read the Databricks Field Guide: chapters on building, running and paying for Databricks, runnable SQL, Python and CLI examples with the explanation around them, and recent Databricks changes, each linked to the docs.databricks.com pages it cites. Read-only tools. Hosted remote Streamable HTTP server; no sign-in and no API key.",
    icon: "https://www.techfabric.com/brand/mcp/techfabric-icon-on-dark-512.png",
    homepage: "https://databricks.techfabric.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://databricks.techfabric.com/mcp"],
    },
    remoteUrl: "https://databricks.techfabric.com/mcp",
  },
  {
    name: "datawebot",
    title: "datawebot",
    description:
      "Ecommerce product data for agents. Search products across online shops worldwide (title, price, shop, rating, reviews, image, link), list every seller's price for one product with direct shop links, and run extraction Jobs on Amazon search and product pages (10 countries) and 1,100+ Shopify stores. Paid from 200 free trial credits. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in by email (free), or an optional API key as a Bearer header.",
    icon: "https://raw.githubusercontent.com/datawebot/datawebot-mcp/main/assets/logo.png",
    homepage: "https://www.datawebot.com/docs/agents",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.datawebot.com/mcp"],
    },
    remoteUrl: "https://mcp.datawebot.com/mcp",
  },
  {
    name: "desearch",
    title: "Desearch",
    description:
      "AI search, X search and web search for AI agents, plus page extraction and X data tools. Bring your own Desearch API key. Local stdio server `desearch-mcp-server` (MIT) through `npx`, with 15 tools; it needs Node.js 20.18.1 or later and a Desearch API key from console.desearch.ai/api-keys, set as `DESEARCH_API_KEY`.",
    icon: "desearch.png",
    homepage: "https://github.com/Desearch-ai/mcp-desearch",
    configuration: {
      command: "npx",
      args: ["-y", "desearch-mcp-server@latest"],
      env: {
        DESEARCH_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "dc-hub",
    title: "DC Hub",
    description:
      "DC Hub is the live data layer for data-center site selection. Its Data Center Power Index (DCPI) is a daily score of where data centers can get grid power, across 300+ markets. Also live grid, fiber, gas and interconnection-queue data, and Capacity Source: search available data-center capacity by size and location and request introductions. 94 tools; every answer carries its source. Hosted remote Streamable HTTP server through `mcp-remote`; free tier works with no API key and no sign-in.",
    icon: "https://raw.githubusercontent.com/azmartone67/dchub-mcp-server/main/dchub-logo.png",
    homepage: "https://dchub.cloud/connect",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://dchub.cloud/mcp"],
    },
    remoteUrl: "https://dchub.cloud/mcp",
  },
  {
    name: "deed-page",
    title: "deed.page",
    description:
      "Publish static sites from your agent to a permanent public HTTPS URL at `<slug>.deed.page`: send a files map and a slug, then update, list, delete, roll back to a retained version, attach a custom domain and read cookieless analytics. 25 tools. Hosted remote Streamable HTTP server at https://deed.page/mcp; publishing needs no sign-in and no API key, and the first publish returns an owner token for later changes. Free sites are public.",
    icon: "https://deed.page/icon.png",
    homepage: "https://deed.page/docs",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://deed.page/mcp"],
    },
    remoteUrl: "https://deed.page/mcp",
  },
  {
    name: "dropthehassle",
    title: "DropTheHassle",
    description:
      "Put the website your AI built online on a live HTTPS link, check with the domain registry whether a domain name is available, and look after your sites: publish a new version or roll back, rename the link, point a domain, set the share image and favicon, and check certificate and visitor numbers. Hosted remote Streamable HTTP server through `mcp-remote`; publishing and domain checks work with no sign-in and no API key, managing sites uses OAuth 2.1 sign-in with dynamic client registration.",
    icon: "https://dropthehassle.com/apple-touch-icon.png",
    homepage: "https://dropthehassle.com/guides/deploy-with-your-ai-mcp?source=raycast-mcp-registry",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://dropthehassle.com/mcp"],
    },
    remoteUrl: "https://dropthehassle.com/mcp",
  },
  {
    name: "dynamic-document-api",
    title: "Dynamic Document API",
    description:
      "Render PDFs and images from saved templates plus JSON, from HTML or from Markdown, merge PDFs, and create validated e-invoices (XRechnung, EN 16931, Factur-X / ZUGFeRD). 9 tools; renders are free, watermarked test renders until a call passes `test: false`. Hosted remote Streamable HTTP server in the EU; OAuth 2.1 sign-in with dynamic client registration and PKCE, free plan, no API key to paste.",
    icon: "https://dynamicdocumentapi.com/assets/img/icon-512.png",
    homepage: "https://dynamicdocumentapi.com/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.dynamicdocumentapi.com/mcp"],
    },
    remoteUrl: "https://mcp.dynamicdocumentapi.com/mcp",
  },
  {
    name: "equibles",
    title: "Equibles",
    description:
      "US stock market data for research: SEC filing search with exact source lines, XBRL financial statements, earnings call transcripts, insider and congressional trades, 13F holdings, short interest, end-of-day prices and FRED macro data. 130 tools: 120 read market data and 10 write to your own Equibles portfolios, watchlist or feedback. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, or a Bearer API key; free plan with 100 requests a day, option chains and live quotes need a paid plan.",
    icon: "https://equibles.com/favicon/favicon/android-chrome-192x192.png",
    homepage: "https://equibles.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.equibles.com/mcp"],
    },
    remoteUrl: "https://mcp.equibles.com/mcp",
  },
  {
    name: "git",
    title: "Git",
    description:
      "A Model Context Protocol server for Git repository interaction and automation. This server provides tools to read, search, and manipulate Git repositories via Large Language Models.",
    icon: "https://svgl.app/library/git.svg",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/git",
    configuration: {
      command: "uvx",
      args: ["mcp-server-git"],
    },
  },
  {
    name: "gitdiagram",
    title: "GitDiagram",
    description:
      "Architecture diagrams of public GitHub repositories: a written explanation of how a codebase is organized, its main components with their source paths, how they connect, and Mermaid source, plus a search of GitDiagram's existing diagrams and explainer-video transcripts. Read-only remote Streamable HTTP server at https://gitdiagram.com/mcp through `mcp-remote`; no sign-in, no API key.",
    icon: "https://raw.githubusercontent.com/ahmedkhaleel2004/gitdiagram/main/plugins/gitdiagram/assets/logo.png",
    homepage: "https://gitdiagram.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://gitdiagram.com/mcp"],
    },
  },
  {
    name: "github",
    title: "GitHub",
    description:
      "The GitHub MCP Server is a Model Context Protocol (MCP) server that provides seamless integration with GitHub APIs, enabling advanced automation and interaction capabilities for developers and tools.",
    icon: {
      source: {
        light: "https://svgl.app/library/github_light.svg",
        dark: "https://svgl.app/library/github_dark.svg",
      },
    },
    homepage:
      "https://github.com/github/github-mcp-server?utm_source=Blog&utm_medium=GitHub&utm_campaign=proplus&utm_notesblogtop",
    configuration: {
      command: "docker",
      args: ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
      },
    },
  },
  {
    name: "gitlab",
    title: "GitLab",
    description: "MCP Server for the GitLab API, enabling project management, file operations, and more.",
    icon: "https://svgl.app/library/gitlab.svg",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab",
    configuration: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-gitlab"],
      env: {
        GITLAB_PERSONAL_ACCESS_TOKEN: "<YOUR_TOKEN>",
        GITLAB_API_URL: "https://gitlab.com/api/v4", // Optional, for self-hosted instances
      },
    },
  },
  {
    name: "glif",
    title: "Glif",
    description:
      "Glif is a media-generation agent: generate images, video, and audio, transcribe, and chain multi-step media workflows from natural language. Hosted remote server with OAuth sign-in.",
    icon: "https://glif.app/glif-icon-512.png",
    homepage: "https://glif.app/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://glif.app/api/mcp"],
    },
  },
  {
    name: "gtd-brain",
    title: "GTD Brain",
    description:
      "Getting Things Done board: capture to Inbox, next actions by context, projects, waiting-for and a weekly review, on the same board as the GTD Brain web, iOS and Android apps. Hosted remote server with OAuth 2.1 sign-in (email code), no API key to paste.",
    icon: "https://gtdbrain.com/gtdbrain/icon-512.png",
    homepage: "https://gtdbrain.com/connect?source=raycast-mcp-registry",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.gtdbrain.com/api/gtdbrain/v1/mcp"],
    },
  },
  {
    name: "edgepedia",
    title: "Edgepedia",
    description:
      "Search and read Edgepedia, a free and growing encyclopedia with citations. Remote Streamable HTTP server at https://www.edgechat.ai/mcp; no sign-in, no API key.",
    icon: "https://raw.githubusercontent.com/EdgePlat/edgepedia-mcp/main/logo-400.png",
    homepage: "https://github.com/EdgePlat/edgepedia-mcp",
    remoteUrl: "https://www.edgechat.ai/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://www.edgechat.ai/mcp"],
    },
  },
  {
    name: "eventsend",
    title: "EventSend",
    description:
      "Ask your AI about your product's events, delivery health and usage. Search events, follow one customer's timeline, see why a Slack, Discord, Telegram or webhook notification failed, and check daily stats and quota. Read-only, 9 tools. Hosted remote Streamable HTTP server at https://eventsend.io/mcp with a direct HTTP connection in Raycast and an `mcp-remote` fallback for other clients; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste; free plan available.",
    icon: "https://eventsend.io/images/pwa/icon-512.png",
    homepage: "https://eventsend.io/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://eventsend.io/mcp"],
    },
    remoteUrl: "https://eventsend.io/mcp",
  },
  {
    name: "evolink",
    title: "EvoLink",
    description:
      "Image, video, music and speech generation with 150+ models from one EvoLink account. Search models and read their published prices, get a quote for an exact task, generate after you approve it, then track the task and your balance. Model search, prices, quotes, task status and balance checks are free; generation is billed to your EvoLink balance. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste.",
    icon: "https://raw.githubusercontent.com/Evolink-AI/mcp-plugin/main/assets/logo.png",
    homepage:
      "https://evolink.ai/mcp?utm_source=raycast&utm_medium=referral&utm_campaign=mcp_remote&utm_content=directory_listing",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.evolink.ai/mcp"],
    },
    remoteUrl: "https://mcp.evolink.ai/mcp",
  },
  {
    name: "exa",
    title: "Exa",
    description:
      "A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way.",
    icon: "exa.png",
    homepage: "https://github.com/exa-labs/exa-mcp-server",
    configuration: {
      command: "npx",
      args: ["exa-mcp-server"],
      env: {
        EXA_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "fotofoto",
    title: "foto foto",
    description:
      "Turn your photos or a public iCloud Shared Album into a printed hardcover photo book. Attach photos, give image links, or paste a public iCloud Shared Album link, and foto foto designs every spread of a hardcover photo book and returns a preview link. The person saves it with their email on fotofoto.app to edit and order it. Also compares photo book prices across services. English and Dutch. Hosted remote Streamable HTTP server at https://fotofoto.app/mcp; no sign-in, no API key.",
    icon: "https://fotofoto.app/icon-512.png",
    homepage: "https://fotofoto.app/developers",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://fotofoto.app/mcp"],
    },
    remoteUrl: "https://fotofoto.app/mcp",
  },
  {
    name: "janction-render",
    title: "JANCTION Render",
    description:
      "Render Blender scenes and 3D models on cloud GPUs from Raycast AI: send a bpy script, a .blend or a GLB / glTF / FBX / USD / OBJ / STL file, get a tiled preview with a critic verdict in seconds, then product shots, 360-degree turntables, animations or stills as PNG frames or an MP4. No local Blender or GPU. 12 tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration creates a key with free GPU time, then 0.1 JPY per GPU-second from prepaid credit.",
    icon: "https://raw.githubusercontent.com/JasmyLab-JANCTION/janction-render/main/assets/logo-400.png",
    homepage: "https://render.janction.jp/?src=raycast",
    remoteUrl: "https://render.janction.jp/mcp?src=raycast",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://render.janction.jp/mcp?src=raycast"],
    },
  },
  {
    name: "jetbrains",
    title: "JetBrains",
    description: "The server proxies requests from client to JetBrains IDE.",
    icon: "https://svgl.app/library/jetbrains.svg",
    homepage: "https://github.com/JetBrains/mcp-jetbrains",
    configuration: {
      command: "npx",
      args: ["-y", "@jetbrains/mcp-proxy"],
    },
  },
  {
    name: "just-domain",
    title: "Just Domain.",
    description: "Check a domain name, both prices and whether it can transfer in. You register it on justdomain.ai.",
    icon: "https://justdomain.ai/just-icon-512.png",
    homepage: "https://justdomain.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.justdomain.ai/"],
    },
    remoteUrl: "https://mcp.justdomain.ai/",
  },
  {
    name: "just-publish",
    title: "Just Publish.",
    description: "Publish and update the website you built with AI at a live public URL. Sign-in required.",
    icon: "https://justpublish.ai/icon.png",
    homepage: "https://justpublish.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.justpublish.ai/"],
    },
    remoteUrl: "https://mcp.justpublish.ai/",
  },
  {
    name: "handoff",
    title: "handoff",
    description:
      "Coordination for autonomous agent swarms: discover funded projects and the agents who can do them, form a team, plan the work as goals and tasks, message end-to-end encrypted, and hand off results that are paid when the requester verifies them. Remote Streamable HTTP server at https://handoff.lol/mcp through `mcp-remote`; no API key, and OAuth 2.1 sign-in (dynamic client registration) when a client wants an account-bound session. Start with the `get_docs` tool.",
    icon: "https://handoff.lol/icon-180.png",
    homepage: "https://handoff.lol",
    remoteUrl: "https://handoff.lol/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://handoff.lol/mcp"],
    },
  },
  {
    name: "heroku",
    title: "Heroku",
    description:
      "The Heroku Platform MCP Server is a specialized Model Context Protocol (MCP) implementation designed to facilitate seamless interaction between large language models (LLMs) and the Heroku Platform. This server provides a robust set of tools and capabilities that enable LLMs to read, manage, and operate Heroku Platform resources.",
    icon: "heroku.svg",
    homepage: "https://github.com/heroku/heroku-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "@heroku/mcp-server"],
      env: {
        HEROKU_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "hermoso",
    title: "Hermoso",
    description:
      "Hermoso is an AI marketing agent and AI ad generator for your AI agent. No markup on models. Research the ads already winning in any market (the Meta, Google and LinkedIn ad libraries plus organic TikTok, Instagram, YouTube, Reddit and Threads), make image and video ads and organic posts in your brand, publish and schedule to 11 social channels or let Autopilot posting fill your calendar, automate DMs on Instagram, Facebook, Messenger and X, and build and manage paid campaigns on 12 ad platforms. Hosted remote server with OAuth sign-in, no API key to paste.",
    icon: "https://raw.githubusercontent.com/hermoso-ai/hermoso/main/assets/logo.png",
    homepage: "https://hermoso.ai/mcp/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.hermoso.ai/mcp?src=raycast"],
    },
  },
  {
    name: "quantral",
    title: "Quantral",
    description:
      "Stock sentiment scores (0-100) per company from the retail investor and market commentator sources Quantral tracks, plus top signals, monthly recaps and the mentions behind each score. Hosted remote server with OAuth sign-in; Quantral subscription required.",
    icon: "https://app.quantral.com/mcp-icon.png?v=2",
    homepage: "https://quantral.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.quantral.com/api/mcp"],
    },
  },
  {
    name: "kagimcp",
    title: "Kagi Search",
    description: "The Official Model Context Protocol (MCP) server for Kagi search & other tools.",
    icon: "kagi.svg",
    homepage: "https://github.com/kagisearch/kagimcp",
    configuration: {
      command: "uvx",
      args: ["kagimcp"],
      env: {
        KAGI_API_KEY: "YOUR_API_KEY_HERE",
        KAGI_SUMMARIZER_ENGINE: "YOUR_ENGINE_CHOICE_HERE", // Defaults to "cecil" engine if env var not present
      },
    },
  },
  {
    name: "keboola",
    title: "Keboola",
    description:
      "Keboola MCP Server is an open-source bridge between your Keboola project and modern AI tools. It turns Keboola features—like storage access, SQL transformations, and job triggers—into callable tools for Claude, Cursor, CrewAI, LangChain, Amazon Q, and more.",
    icon: "keboola.svg",
    homepage: "https://github.com/keboola/mcp-server",
    configuration: {
      command: "npx",
      args: ["mcp-remote", "https://mcp.canary-orion.keboola.dev/sse"],
    },
  },
  {
    name: "keboola-local",
    title: "Keboola (Local)",
    description:
      "Keboola MCP Server is an open-source bridge between your Keboola project and modern AI tools. It turns Keboola features—like storage access, SQL transformations, and job triggers—into callable tools for Claude, Cursor, CrewAI, LangChain, Amazon Q, and more. This is the local server version.",
    icon: "keboola.svg",
    homepage: "https://github.com/keboola/mcp-server",
    configuration: {
      command: "uvx",
      args: ["keboola_mcp_server", "--api-url", "https://connection.YOUR_REGION.keboola.com"],
      env: {
        KBC_STORAGE_TOKEN: "your_keboola_storage_token",
        KBC_WORKSPACE_SCHEMA: "your_workspace_schema",
      },
    },
  },
  {
    name: "keeploop",
    title: "Keeploop",
    description:
      "Your Mac's Apple Mail and Calendar for Raycast AI. Search mail, read threads, see who is waiting on a reply and check your calendar; writes stay off until you allow them on your Mac. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste. Needs the Keeploop Mac app with Keeploop Pro or its free trial for remote use; local use is free.",
    icon: "https://keeploop.app/assets/app-icon.svg",
    homepage: "https://keeploop.app",
    remoteUrl: "https://mcp.keeploop.app/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.keeploop.app/mcp"],
    },
  },
  {
    name: "kimiko",
    title: "Kimiko",
    description:
      "Your meetings, notes and tasks from Kimiko, the private AI note taker, in Raycast AI and your other AI apps. Search meetings, notes and transcripts, read a meeting's summary, and list, add or update tasks; three prompts cover a weekly review, meeting prep and open loops. Local stdio server that ships inside the Kimiko desktop app at /Applications/Kimiko.app/Contents/MacOS/kimiko-mcp, so this entry is Mac only. No hosted endpoint and no API key: it reads Kimiko's database on your Mac, and it stays off until you turn on Allow AI apps in Kimiko → Settings → Connections. On the first connection, macOS asks you to allow Keychain access. An AI app may send what it reads to its own cloud service. Kimiko is a paid app with a free trial.",
    icon: "https://kimiko.app/brand/kimiko-logo-dark-512.png",
    homepage: "https://kimiko.app/#mcp-connector",
    configuration: {
      command: "/Applications/Kimiko.app/Contents/MacOS/kimiko-mcp",
      args: [],
    },
  },
  {
    name: "kolect",
    title: "Kolect Creator Search",
    description:
      "Find TikTok, Instagram and YouTube creators for influencer marketing. Describe a campaign in plain language to search 300M+ creators, look up creators by link or @handle, check fake followers, get public contact emails and save shortlists. Hosted remote Streamable HTTP server through `mcp-remote`; Kolect API key as an `Authorization: Bearer` header (free account, 90 credits on sign-up).",
    icon: "https://app.kolect.ai/kolect-logo-mark.png",
    homepage: "https://www.kolect.ai/ai-assistant",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.kolect.ai/mcp", "--header", "Authorization: Bearer YOUR_API_KEY"],
    },
  },
  {
    name: "filesystem",
    title: "Filesystem",
    description:
      "Node.js server implementing Model Context Protocol (MCP) for filesystem operations. The server will only allow operations within directories specified via args.",
    icon: Icon.Folder,
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    configuration: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "YOUR_ALLOWED_PATH_HERE"],
    },
  },
  {
    name: "flightqueue",
    title: "FlightQueue",
    description:
      "Airport security wait times, FAA delays, EES border queues and baggage stats. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/Flight-Queue/mcp/HEAD/assets/logo.png",
    homepage: "https://flightqueue.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.flightqueue.com/mcp"],
    },
  },
  {
    name: "flightseatmap",
    title: "FlightSeatMap",
    description:
      "Seat maps, seat ratings, traveller reviews and seat alerts for 117 airlines. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://avatars.githubusercontent.com/u/277431901?s=512",
    homepage: "https://flightseatmap.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.flightseatmap.com/mcp"],
    },
  },
  {
    name: "frantic",
    title: "Frantic",
    description:
      "Find funded bounties, inspect the public receipt ledger and enlist an agent to claim work and deliver results. Accepted work is paid in USDC on Base; posting and funding a bounty uses x402. Public MCP reads need no sign-in, while agent and vendor actions use Frantic's own credentials and payment flow. Hosted remote Streamable HTTP MCP server.",
    icon: "https://gofrantic.com/favicon-512.png",
    homepage: "https://gofrantic.com/SKILL.md",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.gofrantic.com/mcp"],
    },
    remoteUrl: "https://api.gofrantic.com/mcp",
  },
  {
    name: "latchkey",
    title: "Latchkey",
    description:
      "CI your coding agents can run, read and fix. Read the GitHub Actions failures Latchkey's self-healing runners could not repair (root cause, failing file and secret-scrubbed logs), check run status and logs, dispatch workflows, and run one-off commands on fresh ephemeral Linux runners. Hosted remote Streamable HTTP server through `mcp-remote`; Latchkey API key as an `Authorization: Bearer` header (30-day trial, no card).",
    icon: "https://avatars.githubusercontent.com/u/238924717?s=512&v=4",
    homepage: "https://latchkey.dev/documentation/connect-your-ai-agent",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://latchkey.dev/mcp", "--header", "Authorization: Bearer YOUR_API_KEY"],
    },
  },
  {
    name: "levea",
    title: "Levea AI Video Editor",
    description:
      "Prompt-first AI video editor. Describe the edit and get a finished MP4: viral clips from long videos, word-by-word animated captions, 9:16 reframe with face tracking, chroma key and background removal, B-roll, AI voiceover and music, silence removal and multi-platform export, plus projects, assets, brand kits and caption templates. 25 tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in in the browser, no API key to paste.",
    icon: "https://raw.githubusercontent.com/brajendrak00068/agentic-ai-video-production/main/assets/logo-icon-400.png",
    homepage: "https://www.livecore.ai/?utm_source=raycast-mcp-registry&utm_medium=directory&utm_campaign=mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.livecore.ai/api/v1/misc/mcp"],
    },
    remoteUrl: "https://api.livecore.ai/api/v1/misc/mcp",
  },
  {
    name: "local-commander",
    title: "Local Commander",
    description:
      "Remote control of all your computers from Raycast AI. Connect your Windows, Mac and Linux machines (work PC, home PC, servers) and ask in one chat: run commands and scripts, read and edit files, check services and logs, take a screenshot, work with Git. The same computers are reachable from ChatGPT, Claude and any AI app with remote MCP, including on your phone. You choose full access or only some folders, block commands and switch any computer off at any time. Needs the Local Commander agent on each computer (`npx local-commander-agent@latest`). Hosted remote Streamable HTTP server; OAuth 2.0 sign-in with dynamic client registration and PKCE, no API key to paste.",
    icon: "https://raw.githubusercontent.com/netbka/local-commander-plugins/main/assets/logo.png",
    homepage: "https://localcmd.app",
    remoteUrl: "https://localcmd.app/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote@0.15.1", "https://localcmd.app/mcp"],
    },
  },
  {
    name: "looot",
    title: "looot",
    description:
      "One key and one prepaid balance for about 2,500 data API operations from 90+ providers: work emails and phone numbers, company and people search, Google results, web pages, news, LinkedIn profiles and local businesses. The agent searches the catalog, sees the price before it runs, and pays per call; a failed call costs nothing. 19 tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, or a Bearer API key. No subscription, top up from $5.",
    icon: "https://raw.githubusercontent.com/loootai/looot-plugin/main/plugins/claude-code/looot/.claude-plugin/icon.png",
    homepage: "https://docs.looot.ai",
    remoteUrl: "https://api.looot.ai/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.looot.ai/mcp"],
    },
  },
  {
    name: "maqami-travel",
    title: "MAQAMI Travel",
    description:
      "Official MCP server for MAQAMI, a hotel and flight booking platform with 3M+ hotels. Search hotels and flights, read hotel details and reviews, then give the customer a secure checkout link on book.maqami.co, where they pay. No booking or payment details in tool calls. Remote Streamable HTTP server at https://mcp.maqami.co/; no sign-in, no API key.",
    icon: "https://maqami.co/android-chrome-512x512.png",
    homepage: "https://github.com/negm17111995/mcp-server",
    remoteUrl: "https://mcp.maqami.co/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.maqami.co/"],
    },
  },
  {
    name: "mcp-checkup",
    title: "MCP Checkup",
    description:
      "Check a public MCP server before you connect it. Look up observed status and reports for servers MCP Checkup tracks, search them by what their tools do, see recent changes to a server's tool list, fetch the Ed25519-signed (DSSE) attestation behind a report, and request a one-off check of a server by URL. Attestations can be verified offline with the open-source verifier at github.com/mcpcheckup/checks (Apache-2.0). Hosted remote Streamable HTTP server at https://mcpcheckup.com/mcp; no sign-in, no API key.",
    icon: "https://mcpcheckup.com/apple-touch-icon.png",
    homepage: "https://mcpcheckup.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcpcheckup.com/mcp"],
    },
    remoteUrl: "https://mcpcheckup.com/mcp",
  },
  {
    name: "medbillanalyzer",
    title: "MedBillAnalyzer",
    description:
      "Check a medical bill against the Explanation of Benefits (EOB) your insurer sent for the same care: the free scan shows how many lines disagree and the dollars in question; a $10 unlock gives each finding, a dispute letter and a phone script. Documents are never stored and cases delete after 30 days. Remote Streamable HTTP server at https://app.medbillanalyzer.com/mcp/apps; no sign-in, no API key.",
    icon: "https://medbillanalyzer.com/icon-512.png",
    homepage: "https://medbillanalyzer.com",
    remoteUrl: "https://app.medbillanalyzer.com/mcp/apps",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.medbillanalyzer.com/mcp/apps"],
    },
  },
  {
    name: "mnemoverse",
    title: "Mnemoverse",
    description:
      "Hosted persistent memory for AI agents over MCP. Rating a recalled memory as helpful or misleading re-ranks what comes back next. Shared rooms (beta) let several agents work from one memory. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste. The free plan needs no credit card.",
    icon: "https://mnemoverse.com/apple-touch-icon.png",
    homepage: "https://mnemoverse.com/docs/api/remote-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.mnemoverse.com/mcp"],
    },
  },
  {
    name: "moltnode",
    title: "MoltNode by Chord",
    description:
      "Read 31 blockchains over JSON-RPC and get best-route DEX swap quotes with unsigned transactions via Chord. No API key. List the chains, call any JSON-RPC method (`eth_*` on EVM chains, native methods on Solana and Sui), read the latest block and native balances, find tokens and get a swap quote with the unsigned transaction, the approval it needs and a simulation on the 7 chains Chord trades on, then broadcast a transaction you signed yourself. Non-custodial: it never holds keys or signs. Hosted remote Streamable HTTP server at https://moltnode.ag/mcp; no sign-in and no API key.",
    icon: "https://raw.githubusercontent.com/tuantqse90/moltnode-mcp/main/assets/logo.png",
    homepage: "https://moltnode.ag",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://moltnode.ag/mcp"],
    },
    remoteUrl: "https://moltnode.ag/mcp",
  },
  {
    name: "multi-calendar",
    title: "Multi Calendar",
    description:
      "Your Outlook.com, Hotmail, Microsoft 365 and Google calendars in Raycast - many accounts at once, one search for free time across all of them. Read events, find free time, create, move and cancel events and answer invitations, make booking links, booking pages and group polls, each account within the permissions its owner sets. No copy of the calendars is kept. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://lumman.co/icon-512.png",
    homepage: "https://lumman.co/mcp/multi-calendar",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://calendar.lumman.co/mcp"],
    },
    remoteUrl: "https://calendar.lumman.co/mcp",
  },
  {
    name: "multi-mail",
    title: "Multi Mail",
    description:
      "Your Gmail, Outlook.com, Hotmail, Microsoft 365, iCloud and Fastmail mailboxes in Raycast - several at once, one search across all of them. Read threads, messages and attachments, draft, send and organise mail, each mailbox within the permissions its owner sets. No copy of the mail is kept. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://lumman.co/icon-512.png",
    homepage: "https://lumman.co/mcp/multi-mail",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mail.lumman.co/mcp"],
    },
    remoteUrl: "https://mail.lumman.co/mcp",
  },
  {
    name: "netactuate",
    title: "NetActuate",
    description:
      "Answers from NetActuate's own published data about its global edge network: data center locations and what each publishes about power, cooling, security and connectivity; which sites hold HIPAA, PCI-DSS, SOC 2 or ISO 27001; where it peers across internet exchanges; the sites nearest a target market; and its products and published pricing, each linked to its netactuate.com page. Read-only tools. Hosted remote Streamable HTTP server; no sign-in and no API key.",
    icon: "https://netactuate.com/mcp/icon.png",
    homepage: "https://netactuate.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://netactuate.com/mcp"],
    },
    remoteUrl: "https://netactuate.com/mcp",
  },
  {
    name: "neverapply",
    title: "NeverApply",
    description:
      "AI job-search agent: search and match jobs, tailor resumes, answer screening questions, prepare for interviews, and apply with your approval. 15 tools. Official hosted remote Streamable HTTP server from Kasovy LLC; OAuth 2.1 sign-in with PKCE and dynamic client registration, no API key to paste.",
    icon: "https://github.com/kasovy.png",
    homepage: "https://neverapply.co/features/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://neverapply.co/mcp"],
    },
    remoteUrl: "https://neverapply.co/mcp",
  },
  {
    name: "new-term-radar",
    title: "New-Term Radar",
    description:
      "Names of new AI models, products and repos as they surface on X, Hugging Face, GitHub and sitemaps, and the search terms behind them sized with Google Ads volume and Google Trends, each marked prioritize, watch or skip. Three tools: recent leads (free), a keyword table for names you give it (about $0.05 a name plus $0.09 a call) and a full radar run (paid, minutes). Local stdio server `new-term-radar` (MIT) from PyPI through `uvx`; needs an AIsa API key set as `AISA_API_KEY` and a config.json copied from the repo's config.example.json, with `RADAR_CONFIG` and `RADAR_STATE` set to absolute paths.",
    icon: "https://raw.githubusercontent.com/zhuyansen/new-term-radar/main/.claude-plugin/icon.png",
    homepage: "https://github.com/zhuyansen/new-term-radar",
    configuration: {
      command: "uvx",
      args: ["--with", "mcp", "new-term-radar", "mcp"],
      env: {
        AISA_API_KEY: "YOUR_API_KEY_HERE",
        RADAR_CONFIG: "/absolute/path/to/config.json",
        RADAR_STATE: "/absolute/path/to/state",
      },
    },
  },
  {
    name: "noonlaunch",
    title: "Noonlaunch",
    description:
      "Launch a product on Noonlaunch, search its product directory and weekly winners, check plans and submission status, and find 333 startup launch directories filtered by category, cost and domain authority. Nothing is published until the maker confirms the listing through a private claim link. Hosted remote Streamable HTTP server at https://noonlaunch.com/mcp; no sign-in, no API key.",
    icon: "https://raw.githubusercontent.com/mukund1158/noonlaunch-mcp/main/logo.png",
    homepage: "https://noonlaunch.com/launch-with-ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://noonlaunch.com/mcp"],
    },
    remoteUrl: "https://noonlaunch.com/mcp",
  },
  {
    name: "overlayqa",
    title: "OverlayQA",
    description:
      "Design QA for coding agents. Run WCAG accessibility (axe-core), color-contrast and design-token audits and AI visual reviews on any public URL, then create and manage QA issues, comments, labels and client review links in OverlayQA. 31 tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste. A free OverlayQA account includes 3 scans a day; creating issues needs a paid plan after a 14-day trial.",
    icon: "https://raw.githubusercontent.com/OverlayQA/mcp/main/icon.png",
    homepage: "https://overlayqa.com/mcp/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.overlayqa.com/mcp"],
    },
    remoteUrl: "https://api.overlayqa.com/mcp",
  },
  {
    name: "paddle",
    title: "Paddle",
    description:
      "Paddle Billing is the developer-first merchant of record. We take care of payments, tax, subscriptions, and metrics with one unified API that does it all. This is a Model Context Protocol (MCP) server that provides tools for interacting with the Paddle API.",
    icon: "paddle.svg",
    homepage: "https://github.com/PaddleHQ/paddle-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "@paddle/paddle-mcp", "--api-key=PADDLE_API_KEY", "--environment=(sandbox|production)"],
    },
  },
  {
    name: "parlor",
    title: "Parlor.sh",
    description:
      "Rooms where AI agents of any vendor talk to each other. A room is a URL: open, join, read, post in and close rooms, and give a room a stable alias address. Rooms are public by URL on purpose, so keep secrets out of them. Remote Streamable HTTP server at https://parlor.sh/mcp; no sign-in, no API key.",
    icon: "https://parlor.sh/favicon.svg",
    homepage: "https://parlor.sh",
    remoteUrl: "https://parlor.sh/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://parlor.sh/mcp"],
    },
  },
  {
    name: "paxa",
    title: "Paxa Labs",
    description:
      "Thai, English and Mandarin speech AI. Speak text aloud through your speakers or save it as audio files with matching captions, using 50 voices that each speak all three languages, mixed sentences included, with direction tags like [whispering]. Design a new voice from a text description. Also speech-to-text with subtitles (research preview), translation into Thai, and OCR and field extraction for PDFs and images. Local stdio server (`npx -y @paxalabs/mcp`) with a Paxa API key; new accounts get 100 free credits.",
    icon: "https://raw.githubusercontent.com/paxalabs/mcp/main/assets/icon.png",
    homepage: "https://paxalabs.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@paxalabs/mcp"],
      env: {
        PAXA_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "perplexity",
    title: "Perplexity",
    description:
      "An MCP server implementation that integrates the Sonar API to provide Claude with unparalleled real-time, web-wide research.",
    icon: "https://svgl.app/library/perplexity.svg",
    homepage: "https://github.com/perplexityai/modelcontextprotocol",
    configuration: {
      command: "npx",
      args: ["-y", "server-perplexity-ask"],
      env: {
        PERPLEXITY_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "pixelesq",
    title: "Pixelesq",
    description:
      "Build and manage your Pixelesq website from Raycast: create pages, edit sections, write content, fix SEO and read analytics, with every edit saved as a draft until you publish.",
    icon: "https://mcp.pixelesq.app/icon.png",
    homepage: "https://www.pixelesq.com/docs/integrations/claude",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.pixelesq.app/mcp"],
    },
  },
  {
    name: "posteverywhere",
    title: "PostEverywhere",
    description:
      "Social media publishing MCP server. Schedule and post to 11 platforms (Instagram, TikTok, YouTube, LinkedIn, X, Facebook, Threads, Pinterest, Bluesky, Telegram, Discord) with media upload, AI captions, campaigns, and analytics through natural language.",
    icon: "https://app.posteverywhere.ai/favicon.svg",
    homepage: "https://developers.posteverywhere.ai/integrations/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@posteverywhere/mcp"],
      env: {
        POSTEVERYWHERE_API_KEY: "<YOUR_API_KEY_HERE>",
      },
    },
  },
  {
    name: "posy",
    title: "Posy",
    description:
      "Build and edit a hand-made link-in-bio page: create or import a page, add, update, move and remove link tiles, set the theme and profile, and publish. Hosted remote Streamable HTTP server at https://posy.page/api/mcp with OAuth 2.1 sign-in (dynamic client registration), no API key to paste; free plan available. Open source (MIT) and self-hostable.",
    icon: "https://posy.page/brand/posy-app-512.png",
    homepage: "https://docs.posy.page/agents/connect",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://posy.page/api/mcp"],
    },
    remoteUrl: "https://posy.page/api/mcp",
  },
  {
    name: "ppl",
    title: "ppl",
    description:
      "Personal CRM for people who work with AI agents: look up and update contacts, log interactions and calls, keep notes, track birthdays, life events and gifts, and set reminders about the people in your life. About 120 tools. Hosted remote Streamable HTTP server at https://withppl.com/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE), no API key to paste. Free beta up to 1,000 contacts, no credit card.",
    icon: "https://withppl.com/img/icons/ppl-app-180.png",
    homepage: "https://withppl.com/agents",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://withppl.com/mcp"],
    },
    remoteUrl: "https://withppl.com/mcp",
  },
  {
    name: "prisma",
    title: "Prisma",
    description:
      "An MCP server that provisions and manages a Prisma Postgres database for your apps, so you don’t have to spend time fiddling with db infrastructure.",
    icon: "https://svgl.app/library/prisma.svg",
    homepage: "https://www.prisma.io/docs/postgres/integrations/mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.prisma.io/mcp"],
    },
  },
  {
    name: "qrx",
    title: "QRX",
    description:
      "Branded, print-ready art QR codes that always scan. Describe a look and give a link: QRX paints an artistic QR code, checks that it decodes, and returns the image with a hosted qrx.to short link that can be re-pointed later. Start a code, wait for the image, list your codes, change where a code points, check your daily allowance and list styles. Hosted remote Streamable HTTP server through `mcp-remote`; QRX API key as an `Authorization: Bearer` header (free account, 42 codes a day).",
    icon: "https://qrx.codes/images/brand/qrx-code-512.png",
    homepage: "https://qrx.codes/developers/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://qrx.codes/mcp", "--header", "Authorization: Bearer YOUR_API_KEY"],
    },
  },
  {
    name: "quibbly",
    title: "Quibbly",
    description:
      "Your LinkedIn inbox in your AI assistant: search synced LinkedIn conversations and connections, see who watched your videos, manage follow-ups, notes and tags, and draft replies that you send yourself. Works alongside any CRM connector. Requires a Quibbly account and the Quibbly Chrome extension with Inbox on. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste.",
    icon: "https://server.quibbly.co/icon-512.png",
    homepage: "https://quibbly.co/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://server.quibbly.co/mcp"],
    },
  },
  {
    name: "quillhub",
    title: "QuillHub",
    description:
      "Search your meeting transcripts, read who said what, pull decisions and action items, get quotes from one person across meetings, and transcribe new files or YouTube links. Hosted remote server with OAuth 2.1 sign-in, no API key to paste.",
    icon: "https://raw.githubusercontent.com/Tim-nocode/quillhub-mcp/main/logo.png",
    homepage:
      "https://quillhub.ai/en/help/mcp-claude-cursor?utm_source=raycast&utm_medium=directory&utm_campaign=mcp-listing",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.quillhub.ai/mcp"],
    },
  },
  {
    name: "quotebill",
    title: "QuoteBill",
    description:
      "Draft quotations and invoices: search 133 templates, look up the published tax rate for 195 countries with the official source, total line items with the same arithmetic as the QuoteBill editor, and get a link that opens the finished document on quotebill.com to export as Excel, Word or PDF. All tools are read-only. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, free QuoteBill account, no API key to paste.",
    icon: "https://raw.githubusercontent.com/auto1225/quotebill-mcp/main/logo.png",
    homepage: "https://quotebill.com/en/guides/connect-ai-assistants/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://quotebill.com/mcp"],
    },
  },
  {
    name: "razuna",
    title: "Razuna",
    description:
      "AI-powered digital asset management for teams. Connect your AI assistant to Razuna's platform to search, organize, and manage your files using natural language commands.",
    icon: {
      source: {
        light:
          "https://app.razuna.com/file/remote?i=6959b8cf1e1400a2cce596fc&f=t&dl=t&c=a0f49bf3ea58a5c444af4cc489e27dcf&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiIvZmlsZS9yZW1vdGU_aT02OTU5YjhjZjFlMTQwMGEyY2NlNTk2ZmMmZj10JmRsPXQmYz1hMGY0OWJmM2VhNThhNWM0NDRhZjRjYzQ4OWUyN2RjZiIsInR5cGUiOiJkaXJlY3QifQ.usKNeusn0MmM9xu7gi2OyWBoZ9fOEVeMPiXDrP0zMwo",
        dark: "https://app.razuna.com/file/remote?i=6959b8cf1e1400a2cce596fc&f=t&dl=t&c=a0f49bf3ea58a5c444af4cc489e27dcf&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiIvZmlsZS9yZW1vdGU_aT02OTU5YjhjZjFlMTQwMGEyY2NlNTk2ZmMmZj10JmRsPXQmYz1hMGY0OWJmM2VhNThhNWM0NDRhZjRjYzQ4OWUyN2RjZiIsInR5cGUiOiJkaXJlY3QifQ.usKNeusn0MmM9xu7gi2OyWBoZ9fOEVeMPiXDrP0zMwo",
      },
    },
    homepage: "https://help.razuna.com/p/mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.razuna.YOUR_REGION/sse?access-token=YOUR_ACCESS_TOKEN"],
    },
  },
  {
    name: "recued",
    title: "Recued",
    description:
      "Connect your AI apps to Recued, the server you run yourself between AI and your mail, calendar, files and CRM records. An app sees only the tools its contract grants: reads run at once, and by default anything that writes or deletes waits for your approval in the Recued web app, with every call recorded. Local stdio server: the `recued` command (`recued --mcp`) on the computer Recued runs on, with the key of a contract you make in the Recued web app (Contracts) as `RECUED_MCP_TOKEN`. If an app cannot find the command, set it to the full path that `which recued` prints. Free and open source (AGPL-3.0); install Recued first.",
    icon: "https://raw.githubusercontent.com/recued/recued/main/.github/assets/recued-logo-400x400.png",
    homepage: "https://recued.com/docs/guides/connect-to-recued/",
    configuration: {
      command: "recued",
      args: ["--mcp"],
      env: {
        RECUED_MCP_TOKEN: "YOUR_CONTRACT_KEY",
      },
    },
  },
  {
    name: "removeduplicates",
    title: "RemoveDuplicates.org",
    description:
      "Remove duplicate lines from a text list, or duplicate rows from CSV/TSV text such as rows copied from Excel or Google Sheets, and get the cleaned text back with counts. Remote Streamable HTTP server at https://removeduplicates.org/mcp through `mcp-remote`; no sign-in and no API key, and text is never stored.",
    icon: "https://removeduplicates.org/icon-512.png",
    homepage: "https://removeduplicates.org/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://removeduplicates.org/mcp"],
    },
  },
  {
    name: "Rube",
    title: "Rube - by Composio",
    description:
      "Rube is a MCP server that connects your AI tools to 500+ apps like Gmail, Slack, GitHub, and Notion. Simply install it in your AI client, authenticate once with your apps, and start asking your AI to perform real actions like 'Send an email' or 'Create a task.'",
    icon: "https://files.buildwithfern.com/v3composio.docs.buildwithfern.com/2025-08-25T08:13:31.781Z/assets/logo.svg",
    homepage: "https://rube.composio.dev",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://rube.composio.dev/mcp"],
      env: {
        npm_config_yes: "true",
      },
    },
  },
  {
    name: "runcrate",
    title: "Runcrate",
    description:
      "Give your AI agent GPUs. See live GPU prices, launch and delete GPU instances (H100, A100, RTX 4090 and more), run commands and jobs over SSH, move files, manage volumes, SSH keys and secrets, call 200+ open inference models and track spend. 37 tools. Hosted remote Streamable HTTP server; OAuth sign-in in the browser, no API key to paste.",
    icon: "https://www.runcrate.ai/android-chrome-512x512.png",
    homepage: "https://www.runcrate.ai/mcp?utm_source=raycast-mcp-registry&utm_medium=directory&utm_campaign=mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.runcrate.ai/mcp"],
    },
    remoteUrl: "https://mcp.runcrate.ai/mcp",
  },
  {
    name: "runx",
    title: "runx",
    description:
      "Search portable agent skills and inspect each manifest, requested authority, trust signals and install command before running it. This public MCP endpoint is read-only; execute skills with the Apache-2.0 runx CLI, which gates consequential actions and signs receipts. Hosted remote Streamable HTTP server; no sign-in needed for discovery.",
    icon: "https://runx.ai/assets/logo/runx-symbol-512.png",
    homepage: "https://runx.ai/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.runx.ai/mcp"],
    },
    remoteUrl: "https://api.runx.ai/mcp",
  },
  {
    name: "truthifi",
    title: "Truthifi",
    description:
      "One verified household record for your AI: accounts, activity, holdings, fees, performance, cash flow and your Truthifi Score, from 18,000+ institutions. Remote Streamable HTTP server with Truthifi OAuth sign-in through `mcp-remote`; no API key needed. It can't move money or place trades.",
    icon: "https://framerusercontent.com/images/u37AxMviOa9x9r67PQkR35LJQ.png",
    homepage: "https://truthifi.com/features/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote@0.14.3", "https://api.truthifi.com/mcp"],
    },
  },
  {
    name: "bankbridge",
    title: "BankBridge",
    description:
      "Read-only access to your own US bank, credit card and investment accounts: balances, transactions, spending by category or merchant, recurring charges, monthly cashflow and holdings. Data is fetched live from your banks on each call and not stored. Remote Streamable HTTP server with BankBridge OAuth 2.1 sign-in (dynamic client registration, PKCE) through `mcp-remote`; no API key needed. Paid: $5/mo per connected bank. It can't move money.",
    icon: "https://github.com/bankbridge-money.png",
    homepage: "https://bankbridge.money/docs/raycast",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote@0.14.3", "https://bankbridge.money/api/mcp"],
    },
  },
  {
    name: "webhound",
    title: "Webhound",
    description:
      "Run private, budgeted reports and datasets with Hound, Webhound's research harness built with DeepSeek V4 Pro and GPT-5.4. The user's dollar budget controls research effort, and each connection authenticates to that user's own Webhound account through OAuth.",
    icon: "https://www.webhound.ai/favicon.ico",
    homepage: "https://github.com/WebhoundAI/webhound-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.webhound.ai/api/v2/mcp"],
    },
  },
  {
    name: "sanity",
    title: "Sanity",
    description: "Direct access to your Sanity projects (content, datasets, releases, schemas) and agent rules.",
    icon: "sanity.svg",
    homepage: "https://www.sanity.io/docs/ai/mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.sanity.io", "--transport", "http-only"],
    },
  },
  {
    name: "scoopkit",
    title: "Scoopkit",
    description:
      "AI-industry news for agents: each story returned once as a structured event classified against a published taxonomy (10 categories, 57 subcategories), with its sources and correction history. List, filter and fetch events, browse the taxonomy, and (Pro) run semantic search. Read-only hosted Streamable HTTP server; no account or API key needed to start (45 days, 100 calls a day), optional X-Api-Key for a free or Pro key.",
    icon: "https://raw.githubusercontent.com/nateslabach/scoopkit-mcp/main/logo.png",
    homepage: "https://github.com/nateslabach/scoopkit-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.scoopkit.dev/mcp"],
    },
    remoteUrl: "https://api.scoopkit.dev/mcp",
  },
  {
    name: "scout7",
    title: "Scout7",
    description:
      "Run a week of organic marketing on loop from your AI agent. Scout7 plans your week from your brand, then writes SEO blogs, videos, LinkedIn carousels and social posts, schedules everything across your channels, and reports what moved — it even checks whether you're cited by ChatGPT and Claude. You approve before anything goes live. Hosted remote Streamable HTTP server with Scout7 OAuth 2.1 sign-in (dynamic client registration) through `mcp-remote`; no API key needed.",
    icon: "https://scout7.ai/apple-touch-icon.png",
    homepage:
      "https://scout7.ai/mcp?utm_source=raycast-mcp-registry&utm_medium=listing&utm_campaign=mcp-directories&ref=raycast-mcp-registry",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.scout7.ai/mcp"],
    },
  },
  {
    name: "send21",
    title: "send21",
    description:
      "Crypto pay links and API for people and AI agents. Create pay links and payment drafts priced in any of 161 fiat currencies, paid in BTC (on-chain or Lightning), USDC, USDT, EURC, SOL or ETH to the owner's approved addresses, check whether they are paid, and propose new receiving addresses for the owner to approve. Non-custodial: send21 never holds keys or funds, and the payer signs in their own wallet. Hosted remote Streamable HTTP server through `mcp-remote`; send21 API key as an `Authorization: Bearer` header (free account).",
    icon: "https://raw.githubusercontent.com/send21io/send21-plugin/main/assets/logo.png",
    homepage: "https://send21.io/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://send21.io/mcp", "--header", "Authorization: Bearer YOUR_API_KEY"],
    },
  },
  {
    name: "sentry",
    title: "Sentry",
    description: "This service provides a Model Context Provider (MCP) for interacting with Sentry's API.",
    icon: "sentry.svg",
    homepage: "https://mcp.sentry.dev/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.sentry.dev/sse"],
    },
  },
  {
    name: "shipmail",
    title: "Shipmail",
    description:
      "Business email on your own domain for people and AI agents. Read, search, send and reply in mailboxes, and manage domains, mailboxes, forwarding, inbox rules, calendars, booking pages, newsletters and webhooks. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in in the browser, or a Shipmail API key as a Bearer header.",
    icon: "https://raw.githubusercontent.com/shipmail-to/shipmail-mcp/main/assets/shipmail-mark-400.png",
    homepage: "https://shipmail.to/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://shipmail.to/api/mcp"],
    },
    remoteUrl: "https://shipmail.to/api/mcp",
  },
  {
    name: "sitelemetry",
    title: "Sitelemetry",
    description:
      "Authorized website audits for the sites you own or maintain: security posture, technical SEO, AI visibility (GEO/AEO), analytics integrations, WCAG 2.2 accessibility and performance, returning evidence-backed findings with fixes in nine languages. Hosted remote server with OAuth sign-in, no API key to paste.",
    icon: "https://sitelemetry.com/favicon.svg",
    homepage: "https://sitelemetry.com/mcp-guide",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://sitelemetry.com/mcp"],
    },
  },
  {
    name: "slack",
    title: "Slack",
    description: "This service provides a Model Context Provider (MCP) for interacting with Slack's API.",
    icon: "https://svgl.app/library/slack.svg",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
    configuration: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-slack"],
      env: {
        SLACK_BOT_TOKEN: "xoxb-your-bot-token",
        SLACK_TEAM_ID: "T01234567",
        SLACK_CHANNEL_IDS: "C01234567, C76543210",
      },
    },
  },
  {
    name: "socialfaktory",
    title: "SocialFaktory",
    description:
      "Write, generate, schedule and publish a brand's social content, in its own voice, on every channel: TikTok, Instagram, YouTube, X, LinkedIn, Facebook and Pinterest. Remote Streamable HTTP server with SocialFaktory OAuth 2.1 sign-in through `mcp-remote`; no API key needed.",
    icon: "https://www.socialfaktory.com/connector-icon-512.png",
    homepage: "https://www.socialfaktory.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://www.socialfaktory.com/mcp"],
    },
  },
  {
    name: "solidping",
    title: "SolidPing",
    description:
      "Open-source uptime and synthetic monitoring. Create, run and diagnose checks (HTTP, DNS, TLS, databases, queues and more), read results and incidents, manage status pages and maintenance windows. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, no API key to paste. Self-hosted instances serve the same endpoint at <base URL>/api/v1/mcp.",
    icon: "https://www.solidping.io/img/logo.png",
    homepage: "https://www.solidping.io",
    remoteUrl: "https://solidping.io/api/v1/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://solidping.io/api/v1/mcp"],
    },
  },
  {
    name: "sourcey",
    title: "Sourcey",
    description:
      "Search and compare current startup credits, discounts and deals, inspect offer evidence and changes, and read Agent Readiness report cards showing what agents can do with software. Read-only hosted Streamable HTTP MCP server; no account or API key needed.",
    icon: "https://sourcey.com/brand/sourcey-mark.png",
    homepage: "https://sourcey.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.sourcey.com/mcp"],
    },
    remoteUrl: "https://mcp.sourcey.com/mcp",
  },
  {
    name: "spacefast",
    title: "Spacefast",
    description:
      "Publish and host what your AI builds: turn pages, apps and artifacts into live Spaces with a built-in database, share them by link or password, connect a custom domain, and update or roll back versions. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://github.com/spacefast.png",
    homepage: "https://spacefast.com/docs/setup/raycast",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.spacefast.com"],
    },
    remoteUrl: "https://mcp.spacefast.com",
  },
  {
    name: "springbrand",
    title: "SpringBrand",
    description:
      "Go-to-market capabilities for your AI agent behind one connector: social listening across X, TikTok, Instagram, YouTube, Reddit and Xiaohongshu; website traffic, traffic-source and SEO research; company, contact and creator discovery; and copy, image, video and voiceover generation. The agent searches for the capability it needs, runs it and gets the result back, billed per call. Hosted remote Streamable HTTP server at https://connector.springbrand.ai/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste.",
    icon: "https://springbrand.ai/apple-touch-icon.png",
    homepage: "https://springbrand.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://connector.springbrand.ai/mcp"],
    },
  },
  {
    name: "symbioza",
    title: "Symbioza",
    description:
      "Run a GPU job under a hard dollar cap and collect the files it writes. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste. Estimates are free; running GPU jobs requires prepaid credit added on the Symbioza website.",
    icon: "https://symbioza.dev/brand/symbioza-appicon-light-512.png",
    homepage: "https://symbioza.dev",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://symbioza.dev/mcp"],
    },
  },
  {
    name: "square",
    title: "Square",
    description:
      "This project follows the Model Context Protocol standard, allowing AI assistants to interact with Square's connect API.",
    icon: "square.svg",
    homepage: "https://github.com/square/square-mcp-server",
    configuration: {
      command: "npx",
      args: ["mcp-remote", "https://mcp.squareup.com/sse"],
    },
  },
  {
    name: "stripe",
    title: "Stripe",
    description:
      "This project follows the Model Context Protocol standard, allowing AI assistants to interact with Stripe's API.",
    icon: "https://svgl.app/library/stripe.svg",
    homepage: "https://github.com/stripe/ai",
    configuration: {
      command: "npx",
      args: ["-y", "@stripe/mcp", "--tools=all", "--api-key=YOUR_STRIPE_SECRET_KEY"],
    },
  },
  {
    name: "supabase",
    title: "Supabase",
    description:
      "This project follows the Model Context Protocol standard, allowing AI assistants to interact with Supabase's API.",
    icon: "https://svgl.app/library/supabase.svg",
    homepage: "https://supabase.com/docs/guides/getting-started/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "<personal-access-token>"],
    },
  },
  {
    name: "suparelay",
    title: "Suparelay",
    description:
      "Make international calls from your AI assistant. Get the price per minute for a phone number or a country, and a Call link that opens the Suparelay browser dialer with the number ready; the person you call answers on their normal phone. Read-only. Hosted remote Streamable HTTP server at https://suparelay.app/mcp; no sign-in and no API key.",
    icon: "https://suparelay.app/web-app-manifest-512x512.png",
    homepage: "https://suparelay.app/ai/mcp",
    remoteUrl: "https://suparelay.app/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://suparelay.app/mcp"],
    },
  },
  {
    name: "tapetide",
    title: "Tapetide",
    description:
      "Indian stock market research for about 8,200 NSE and BSE listed companies: quotes, quarterly and annual financials, shareholding, a 326-ratio fundamental screener, technical screens, FII/DII flows, end-of-day index option chains, Tapetide Score, company filings and your own Tapetide portfolio and watchlist. 55 tools. Hosted remote Streamable HTTP server; OAuth 2.1 Google sign-in with dynamic client registration and PKCE, no API key to paste; free plan with 50 tool calls a day. Research data, not investment advice.",
    icon: "https://github.com/Tapetide-hq.png",
    homepage: "https://tapetide.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.tapetide.com/mcp"],
    },
    remoteUrl: "https://mcp.tapetide.com/mcp",
  },
  {
    name: "taplio",
    title: "Taplio",
    description: "Write, schedule and analyze LinkedIn posts, find inspiration, comment, like and connect via Taplio.",
    icon: "https://cdn.prod.website-files.com/6939243f5769a4de787769c3/693fd25c10dab46c2d863cbd_taplio_webclip.png",
    homepage: "https://taplio.com/taplio-linkedin-mcp",
    remoteUrl: "https://mcp.taplio.com/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.taplio.com/"],
    },
  },
  {
    name: "tavily",
    title: "Tavily",
    description:
      "This project follows the Model Context Protocol standard, allowing AI assistants to interact with Tavily's API.",
    icon: "tavily.svg",
    homepage: "https://github.com/tavily-ai/tavily-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "tavily-mcp"],
      env: {
        TAVILY_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "techfabric",
    title: "TechFabric",
    description:
      "Lets TechFabric's engineers write blog posts and case studies for techfabric.com from the coding agent they already use, with its repository and context: today's brief, the site's checks, and a draft under their byline that only they publish. Anyone can also search and read the site. Hosted remote Streamable HTTP server; reading needs no sign-in and no API key, writing uses OAuth 2.1 sign-in with a TechFabric Microsoft account (dynamic client registration and PKCE).",
    icon: "https://www.techfabric.com/brand/mcp/techfabric-icon-on-dark-512.png",
    homepage: "https://www.techfabric.com/mcp-servers",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://www.techfabric.com/mcp"],
    },
    remoteUrl: "https://www.techfabric.com/mcp",
  },
  {
    name: "terminal-tax",
    title: "Terminal Tax",
    description:
      "E-file a 2025 US federal Form 1040 from your AI assistant. Nothing to install or connect to file: any assistant that can run a shell command or make an HTTPS request sends JSON-RPC POST requests to https://mcp.terminal.tax/v1/hosted-mcp directly, with no account, API key or OAuth. Three tools (create_filing_session, get_packet_schema, continue_filing_session) start a filing session, return the packet schema, and check the prepared packet, returning either the problems to correct or one link to a private filing page, where you review the complete return, sign it and authorize payment; Terminal Tax then e-files it with the IRS. $19.99 per federal return, charged only if the IRS accepts it. Federal only.",
    icon: "https://raw.githubusercontent.com/terminaltax/terminal-tax-mcp-server/main/logo.png",
    homepage: "https://terminal.tax",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.terminal.tax/v1/hosted-mcp"],
    },
    remoteUrl: "https://mcp.terminal.tax/v1/hosted-mcp",
  },
  {
    name: "the-bridge",
    title: "The Bridge",
    description:
      "Complete, hosted login, teams, billing and feature flags for your SaaS app, set up by your AI assistant: sign-in and sign-up pages, Google and Microsoft sign-in, magic links, passkeys, MFA and SSO; customer teams with email invites and roles; plans, prices and usage limits on Stripe; and feature flags per plan, customer or rule. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/thebridgedev/bridge-mcp/main/assets/logo-400.png",
    homepage: "https://thebridge.dev/docs/ai-assistants/mcp/",
    remoteUrl: "https://api.thebridge.dev/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.thebridge.dev/mcp"],
    },
  },
  {
    name: "thena",
    title: "Thena",
    description:
      "A Model Context Protocol server that enables AI assistants to interact with Thena's services, providing seamless integration and enhanced capabilities for AI-powered applications.",
    icon: "thena.svg",
    homepage: "https://thena.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.thena.ai/sse"],
    },
  },
  {
    name: "topxai-models",
    title: "TopxAI Models",
    description:
      "Ask Claude, GPT, Grok, GLM, Kimi or DeepSeek from inside another model's conversation: a second opinion, a review, or a model your client does not have. List the text models with their USD prices per million tokens, send a prompt to one of them, or ask TypeSafe's Jev typed yes/no, choice and score questions about a piece of text. Each call is billed to your prepaid TopxAI credit at the model's token price plus a $0.001 call fee, and the reply reports the exact charge. Hosted remote Streamable HTTP server through `mcp-remote`; TopxAI API key as an `Authorization: Bearer` header.",
    icon: "https://ai.topxea.com/apple-touch-icon.png",
    homepage: "https://ai.topxea.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://ai.topxea.com/mcp/models", "--header", "Authorization: Bearer YOUR_API_KEY"],
    },
  },
  {
    name: "trends-mcp",
    title: "Trends MCP",
    description:
      "Live cross-platform trend data for AI agents. Query Google, YouTube, TikTok, Reddit, Amazon, Wikipedia, news, npm, Steam, and more: historical series, growth rates, and live leaderboards in one connection. Free API key at trendsmcp.ai.",
    icon: "https://www.trendsmcp.ai/static/pages/trendsmcp/assets/trend.svg",
    homepage: "https://trendsmcp.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.trendsmcp.ai/mcp", "--header", "Authorization: Bearer YOUR_API_KEY"],
    },
  },
  {
    name: "tripsy",
    title: "Tripsy",
    description:
      "Tripsy's official MCP server connects AI assistants to your Tripsy account so you can create trips and manage flights, stays, activities, expenses, and itinerary details through natural language.",
    icon: "https://framerusercontent.com/images/4xxcLxeTur6SPIrEG8pq54OT3Y.png",
    homepage: "https://tripsy.app",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.tripsy.app"],
    },
  },
  {
    name: "trvlrr",
    title: "Trvlrr",
    description:
      "Your travel journal in Raycast: every trip you've taken and the ones you're planning, with their flights, stays, activities and expenses, plus lifetime stats (countries, cities, flights, distance) and, with Trvlrr Plus, photo search. Ask about a trip, add a booking by pasting it, or import a whole trip from anywhere. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, free Trvlrr account, no API key to paste.",
    icon: "https://trvlrr.app/icon-512.png",
    homepage: "https://trvlrr.app/features/ai-assistant",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://trvlrr.app/mcp"],
    },
  },
  {
    name: "unblockingapi",
    title: "UnblockingAPI",
    description:
      "Fetch public web pages that block simple requests, and get clean Markdown, HTML or template JSON back. Three read-only tools: unblock_fetch returns Markdown by default or HTML, optionally narrowed with a CSS selector, or structured JSON when a published template covers the site; find_templates finds templates by URL, keyword or category; get_build_guide explains building apps on the REST API. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, or a Bearer API key; 500 free credits on sign-up, no card.",
    icon: "https://unblockingapi.com/app-icon.png",
    homepage: "https://unblockingapi.com/tools",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.unblockingapi.com/mcp"],
    },
    remoteUrl: "https://mcp.unblockingapi.com/mcp",
  },
  {
    name: "visualping",
    title: "Visualping",
    description:
      "Remote MCP server from Visualping, the website change monitoring service. Agents can create, edit, run, pause and delete monitors, list monitors, read recently detected changes, and read full monitor settings such as AI alerting, notifications, schedule, page actions and crawl config. OAuth sign-in with your Visualping account, and actions follow your Visualping role in each workspace. Public beta. Hosted remote Streamable HTTP server; OAuth 2.0 sign-in with dynamic client registration and PKCE, no API key to paste; available on all Visualping plans, including Free.",
    icon: "https://github.com/webmonitoring.png",
    homepage: "https://help.visualping.io/en/articles/11982593",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://visualping.io/mcp"],
    },
    remoteUrl: "https://visualping.io/mcp",
  },
  {
    name: "voicemoat",
    title: "VoiceMoat",
    description:
      "The personal brand OS for Twitter/X and LinkedIn. Score a draft against your voice profile, improve it, get hooks and post ideas, read your analytics and recent posts, and publish or schedule posts. Publishing and scheduling are two-step: the first call only returns a preview, and a second call with its one-time code is needed to post. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste. Requires a paid VoiceMoat Pro or Enterprise plan; scoring and improving use plan credits.",
    icon: "https://raw.githubusercontent.com/prateeks367/voicemoat-mcp/main/assets/voicemoat-icon-512.png",
    homepage: "https://voicemoat.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.voicemoat.com/api/mcp"],
    },
  },
  {
    name: "vomo",
    title: "VOMO",
    description:
      "Find and read your VOMO meeting notes and original transcripts. List saved notes, search by keyword, and retrieve summaries or transcripts from your own account. Read-only notes:read access; no recording, uploads, edits, deletion, or purchases. Connects to VOMO's hosted server through mcp-remote with OAuth sign-in, dynamic client registration, and PKCE. Requires Node.js with npm and an existing VOMO account with saved notes.",
    icon: "https://vomo.ai/icons/vomo-app-icon.svg",
    homepage: "https://vomo.ai/cli",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.vomo.ai/mcp", "--host", "127.0.0.1"],
    },
  },
  {
    name: "watchgoose",
    title: "Watchgoose",
    description:
      "Monitor cron jobs and recurring work through a project-scoped Watchgoose connection. Connect one Watchgoose project to inspect checks and status history. Read-only access is the default. With explicit read-and-write consent, it can inspect recent signals and integrations and create, update, pause, resume, or delete checks. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, free Watchgoose plan available, no API key to paste.",
    icon: "https://watchgoose.com/static/img/watchgoose-icon-512.png",
    homepage: "https://watchgoose.com/docs/mcp/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.watchgoose.com/mcp"],
    },
    remoteUrl: "https://mcp.watchgoose.com/mcp",
  },
  {
    name: "wave-ai",
    title: "Wave AI",
    description:
      "Wave AI is an AI note taker for phone calls, meetings and in-person conversations. Ask what was decided, what a person said (Voice ID finds people you have named in Wave), or what you still owe, then update action items, organize folders and share recordings without opening Wave. Wave never deletes recordings or edits transcripts, and it asks before sharing. Hosted remote Streamable HTTP server; OAuth 2.0 sign-in with PKCE and dynamic client registration, free Wave account, no API key to paste.",
    icon: "https://wave.co/brand/icon-rounded-512.png",
    homepage: "https://help.wave.co/integrations/connect-wave-to-other-ai-tools",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.wave.co"],
    },
    remoteUrl: "https://mcp.wave.co",
  },
  {
    name: "weio-site-check",
    title: "Weio site check",
    description:
      "Website facts for AI agents. Check whether a domain and its www version load securely in a browser or show a privacy warning, and why (expired certificate, name mismatch, self-signed, no HTTPS, redirect problems, unreachable), with the certificate expiry date; read what a homepage publishes (title and description, language, CMS or site builder, mobile viewport tag, role contact emails such as info@ and sales@ with personal-name addresses left out, phone numbers, social links, contact page); and list businesses from a small dated scan index (currently dental businesses in Fresno County, California). Read-only; public websites only, one homepage fetch, no crawling. Remote Streamable HTTP server at https://weio.ai/mcp; no sign-in, 10 free calls a day without a key, more with a paid Weio API key sent as an `Authorization: Bearer` header.",
    icon: "https://raw.githubusercontent.com/weioai/site-check-mcp/main/logo.png",
    homepage: "https://github.com/weioai/site-check-mcp",
    remoteUrl: "https://weio.ai/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://weio.ai/mcp"],
    },
  },
  {
    name: "web3juice",
    title: "Web3Juice",
    description:
      "Evidence-backed DeFi yield data for AI assistants. See what ~17,000 pools across 100+ chains pay, where the yield comes from (base vs reward-token APY), how rates have moved over 90 days, and compare pools side by side; every number dated and linked. Read-only: no wallet access, signing or transactions. Remote Streamable HTTP server at https://web3juice.com/api/mcp; no sign-in and no API key for the research tools, optional API key for higher limits.",
    icon: "https://raw.githubusercontent.com/jimbob1414/web3juice-mcp/main/icon.png",
    homepage: "https://web3juice.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://web3juice.com/api/mcp"],
    },
    remoteUrl: "https://web3juice.com/api/mcp",
  },
  {
    name: "webly",
    title: "Webly",
    description:
      "Website hosting for AI agents: publish a website, or share files and folders, at a live URL in seconds. Claim a site to keep it, edit it over MCP, publish drafts you approve, connect a custom domain and roll back with version history. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, or a bearer API key.",
    icon: "https://raw.githubusercontent.com/Webly-AI/webly-plugin/main/assets/logo.svg",
    homepage: "https://webly.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.webly.ai/v1/mcp"],
    },
    remoteUrl: "https://api.webly.ai/v1/mcp",
  },
  {
    name: "worthbase",
    title: "Worthbase",
    description:
      "Your household's net worth in Raycast: shares, ETFs, crypto, gold and silver, super and retirement accounts, property, cash and loans, owned by people, trusts or companies, priced daily with exact cost bases, gains, performance (XIRR), goals and history. Ask what you're worth, how your shares did or what selling would make; hand it a statement to record, previewed before anything is saved and undoable. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, Worthbase account (7-day free trial), no API key to paste.",
    icon: "https://worthbase.app/icon-512.png",
    homepage: "https://worthbase.app/claude/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://worthbase.app/mcp"],
    },
  },
  {
    name: "xero",
    title: "Xero",
    description:
      "This is a Model Context Protocol (MCP) server implementation for Xero. It provides a bridge between the MCP protocol and Xero's API, allowing for standardized access to Xero's accounting and business features.",
    icon: "xero.svg",
    homepage: "https://github.com/XeroAPI/xero-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "@xeroapi/xero-mcp-server@latest"],
      env: {
        XERO_CLIENT_ID: "YOUR_CLIENT_ID_HERE",
        XERO_CLIENT_SECRET: "YOUR_CLIENT_SECRET_HERE",
      },
    },
  },
  {
    name: "xtiles",
    title: "xTiles",
    description:
      "Turn AI chats into xTiles projects, notes and tasks, and pull any project back into the chat. Save plans and research to pages, create and update tasks with due dates and assignees, add notes to your daily planner and read your calendar, then get a project's current state, decisions and open tasks. 39 tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, free xTiles account, no API key to paste.",
    icon: "https://xtiles.app/android-chrome-512x512.png",
    homepage: "https://xtiles.app/en/imagine/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.xtiles.app/mcp"],
    },
    remoteUrl: "https://mcp.xtiles.app/mcp",
  },
  {
    name: "revid",
    title: "Revid",
    description:
      "Research what goes viral, make finished short-form videos and post them. Search viral TikTok, YouTube, Instagram and X videos for hooks and formats, render a finished video with voice, captions, music and AI footage from a prompt, script, article or upload, run recurring series, then publish or schedule it to your connected accounts. 30 tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration, or a Revid API key as a bearer token.",
    icon: "https://www.revid.ai/revid_logo_square_bg_512.png",
    homepage: "https://www.revid.ai/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://www.revid.ai/api/mcp"],
    },
    remoteUrl: "https://www.revid.ai/api/mcp",
  },
  {
    name: "firecrawl",
    title: "Firecrawl",
    description:
      "A Model Context Protocol (MCP) server implementation that integrates with Firecrawl for web scraping capabilities.",
    icon: "🔥",
    homepage: "https://github.com/firecrawl/firecrawl-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "firecrawl-mcp"],
      env: {
        FIRECRAWL_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "playwright",
    title: "Playwright",
    description:
      "A Model Context Protocol server that provides browser automation capabilities using Playwright. This server enables LLMs to interact with web pages through structured accessibility snapshots, bypassing the need for screenshots or visually-tuned models.",
    icon: "https://playwright.dev/img/playwright-logo.svg",
    homepage: "https://github.com/microsoft/playwright-mcp",
    configuration: {
      command: "npx",
      args: ["@playwright/mcp@latest"],
    },
  },
  {
    name: "notion",
    title: "Notion",
    description:
      "The Notion MCP Server is a Model Context Protocol (MCP) server that provides seamless integration with Notion APIs, enabling advanced automation and interaction capabilities for developers and tools.",
    icon: "https://svgl.app/library/notion.svg",
    homepage: "https://github.com/makenotion/notion-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "@notionhq/notion-mcp-server"],
      env: {
        OPENAPI_MCP_HEADERS: '{"Authorization": "Bearer ntn_****", "Notion-Version": "2022-06-28" }',
      },
    },
  },
  {
    name: "pydantic-run-python",
    title: "Pydantic Run Python",
    description:
      "The MCP Run Python package is an MCP server that allows agents to execute Python code in a secure, sandboxed environment. It uses Pyodide to run Python code in a JavaScript environment with Deno, isolating execution from the host system.",
    icon: "pydantic.svg",
    homepage: "https://ai.pydantic.dev/mcp/run-python/",
    configuration: {
      command: "deno",
      args: [
        "run",
        "-N",
        "-R=node_modules",
        "-W=node_modules",
        "--node-modules-dir=auto",
        "jsr:@pydantic/mcp-run-python",
        "stdio",
      ],
    },
  },
  {
    name: "pydantic-logfire",
    title: "Pydantic Logfire",
    description:
      "This repository contains a Model Context Protocol (MCP) server with tools that can access the OpenTelemetry traces and metrics you've sent to Logfire. This MCP server enables LLMs to retrieve your application's telemetry data, analyze distributed traces, and make use of the results of arbitrary SQL queries executed using the Logfire APIs.",
    icon: "pydantic.svg",
    homepage: "https://github.com/pydantic/logfire-mcp",
    configuration: {
      command: "uvx",
      args: ["logfire-mcp", "--read-token=YOUR_TOKEN_HERE"],
    },
  },
  {
    name: "polar",
    title: "Polar",
    description: "Extend the capabilities of your AI Agents with Polar as MCP Server",
    icon: "polar.svg",
    homepage: "https://docs.polar.sh/integrate/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "--package", "@polar-sh/sdk", "--", "mcp", "start", "--access-token", "YOUR_ACCESS_TOKEN_HERE"],
    },
  },
  {
    name: "elevenlabs",
    title: "ElevenLabs",
    description:
      "Official hosted MCP server for managing ElevenLabs agents, tools, knowledge bases, conversations, tests, and audio generation through an OAuth-authenticated workspace connection.",
    icon: {
      source: "elevenlabs.svg",
      tintColor: Color.PrimaryText,
    },
    homepage: "https://elevenlabs.io/docs/eleven-agents/operate/hosted-mcp",
    remoteUrl: "https://api.elevenlabs.io/v1/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.elevenlabs.io/v1/mcp"],
    },
  },
  {
    name: "apify",
    title: "Apify",
    description:
      "A Model Context Protocol (MCP) server for Apify enabling AI agents to use 5,000+ ready-made Actors for use cases such as extracting data from websites, social media, search engines, online maps, and more.",
    icon: "https://apify.com/ext/apify-symbol-512px.svg",
    homepage: "https://mcp.apify.com",
    configuration: {
      command: "npx",
      args: ["-y", "@apify/actors-mcp-server"],
      env: {
        APIFY_TOKEN: "YOUR_API_TOKEN_HERE",
      },
    },
  },
  {
    name: "nuxt",
    title: "Nuxt",
    description: "Access Nuxt documentation, migration guide, modules, and blog posts with the public Nuxt MCP server",
    icon: "nuxt.svg",
    homepage: "https://nuxt.com/mcp",
    configuration: {
      command: "npx",
      args: ["mcp-remote", "https://nuxt.com/mcp"],
    },
  },
  {
    name: "nuxt-ui",
    title: "Nuxt UI",
    description:
      "Access Nuxt UI documentation, components, and configuration with the official Nuxt UI Model Context Protocol (MCP) server.",
    icon: "nuxt.svg",
    homepage: "https://ui.nuxt.com/docs/getting-started/ai/mcp",
    configuration: {
      command: "npx",
      args: ["mcp-remote", "https://ui.nuxt.com/mcp"],
    },
  },
  {
    name: "zeabur",
    title: "Zeabur",
    description:
      "Zeabur provides an official Model Context Protocol (MCP) server that allows you to manage and deploy your Zeabur projects.",
    icon: "zeabur.svg",
    homepage: "https://zeabur.com/docs/en-US/mcp",
    configuration: {
      command: "npx",
      args: ["zeabur-mcp@latest"],
      env: {
        ZEABUR_TOKEN: "YOUR_ZEABUR_TOKEN_HERE",
      },
    },
  },
  {
    name: "zip-codes",
    title: "Zip-Codes.com",
    description:
      "Location intelligence for US addresses and ZIP Codes: standardize a US street address to its ZIP+4, look up US ZIP Codes, ZIP+4s and Canadian postal codes, turn coordinates into a postal code, find postal areas within a radius, measure distance, and request census tract demographics, mapped districts and school districts. 11 read-only tools, including free reference tools for counties, metro areas, USPS city-name rules and data sources. Hosted remote Streamable HTTP server; no sign-in and no API key for demo mode (real values, deeper fields withheld except on demo codes and addresses); an optional X-Api-Key header with a free key (2,500 credits a day) removes the masking.",
    icon: "https://www.zip-codes.com/api/images/icon/icon-512.png",
    homepage: "https://www.zip-codes.com/api/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.zip-codes.com/mcp"],
    },
    remoteUrl: "https://mcp.zip-codes.com/mcp",
  },
  {
    name: "zonefoundry",
    title: "ZoneFoundry for Sonos",
    description:
      "Sonos MCP server. Control your Sonos speakers from Raycast: play songs, artists and playlists, set the volume, group rooms, move music to another room, switch to TV, and send spoken announcements and reminders. Works through the official Sonos cloud with no home bridge; needs the free ZoneFoundry iOS app signed in to your Sonos account. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://zonefoundry.dev/apple-touch-icon.png",
    homepage: "https://zonefoundry.dev/guides/ai-agent-control/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://relay.zonefoundry.dev/mcp"],
    },
  },
  {
    name: "grafana",
    title: "Grafana",
    description:
      "Official Grafana MCP server that provides seamless integration with Grafana APIs, enabling monitoring, visualization, and observability capabilities for developers and tools.",
    icon: "https://svgl.app/library/grafana.svg",
    homepage: "https://github.com/grafana/mcp-grafana",
    configuration: {
      command: "docker",
      args: ["run", "--rm", "-p", "8000:8000", "-e", "GRAFANA_URL", "-e", "GRAFANA_API_KEY", "mcp/grafana"],
      env: {
        GRAFANA_URL: "YOUR_GRAFANA_URL_HERE",
        GRAFANA_API_KEY: "YOUR_SERVICE_ACCOUNT_TOKEN_HERE",
      },
    },
  },
  {
    name: "anytype",
    title: "Anytype",
    description:
      "An MCP server enabling AI assistants to interact with Anytype - your safe haven for digital collaboration - to organize channels, pages, lists, and more through natural language.",
    icon: "anytype.png",
    homepage: "https://github.com/anyproto/anytype-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@anyproto/anytype-mcp"],
      env: {
        OPENAPI_MCP_HEADERS: '{"Authorization":"Bearer <YOUR_API_KEY>", "Anytype-Version":"2025-11-08"}',
      },
    },
  },
  {
    name: "gen-pdf",
    title: "Gen-PDF",
    description:
      "MCP server to generate professional looking PDF. Perfect for creating reports, invoices, contracts, and more.",
    icon: "https://gen-pdf.com/favicon.ico",
    homepage: "https://gen-pdf.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://gen-pdf.com/mcp"],
    },
  },
  {
    name: "linear",
    title: "Linear",
    description:
      "The Model Context Protocol (MCP) server provides a standardized interface that allows any compatible AI model or agent to access your Linear data in a simple and secure way. The Linear MCP server has tools available for finding, creating, and updating objects in Linear like issues, projects, and comments.",
    icon: "https://svgl.app/library/linear.svg",
    homepage: "https://linear.app/docs/mcp",
    remoteUrl: "https://mcp.linear.app/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
    },
  },
  {
    name: "olostep",
    title: "Olostep",
    description:
      "A Model Context Protocol server for Olostep, the web data API for AI. Search the web, scrape any URL into clean Markdown/HTML/JSON, crawl entire sites, batch-process up to 10k URLs, and get cited AI answers — all through one API.",
    icon: "https://www.olostep.com/images/olostep-logo-cropped.svg",
    homepage: "https://github.com/olostep/olostep-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "olostep-mcp"],
      env: {
        OLOSTEP_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "routemesh",
    title: "RouteMesh",
    description:
      "Query multiple EVM blockchain chains from one MCP server. Pull on-chain data including blocks, transactions, logs, balances, and fees with RouteMesh routing and failover.",
    icon: "https://routeme.sh/icon.png",
    homepage: "https://github.com/routemesh/routemesh-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@routemesh/mcp"],
      env: {
        ROUTEMESH_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "jellypod",
    title: "Jellypod",
    description:
      "Jellypod's Model Context Protocol server lets AI assistants create, edit, and publish conversational AI podcasts and video episodes.",
    icon: "https://www.jellypod.com/assets/app-icon-square.png",
    homepage: "https://www.jellypod.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.jellypod.com/mcp"],
    },
  },
  {
    name: "plori",
    title: "plori",
    description:
      "Create and drive cloud AI agents in persistent environments with durable disks, real CLI tools, and memory. Supports runs, human input, scheduling, connections, and workflows over remote MCP. Sign in with OAuth 2.1, or use an API key for headless setups.",
    icon: "https://plori.ai/icon-512.png",
    homepage: "https://plori.ai/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.plori.ai/mcp"],
    },
  },
  {
    name: "appwrite",
    title: "Appwrite",
    description:
      "The official Appwrite MCP server lets AI assistants securely inspect and manage Appwrite projects and resources through Appwrite's API.",
    icon: "https://mcp.appwrite.io/favicon.svg",
    homepage: "https://github.com/appwrite/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.appwrite.io/"],
    },
  },
  {
    name: "agentcard",
    title: "Agentcard",
    description:
      "Prepaid virtual cards for AI agents. Fund a wallet, set spend caps and human approvals, and your agent mints a one-time virtual card for each purchase that works at any merchant. Connects to the remote Agentcard MCP server over OAuth 2.0.",
    icon: "https://www.agentcard.sh/logo-icon.png",
    homepage: "https://agentcard.sh",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.agentcard.sh/mcp"],
    },
  },
  {
    name: "usemycontext",
    title: "UseMyContext",
    description:
      "The personal context layer for AI: one user-owned profile plus files, read by any MCP client so you never re-introduce yourself. Tools for profile, file search and reads, cited answers from your documents, and exact table queries. Connects to the remote UseMyContext server over OAuth 2.1.",
    icon: "usemycontext.svg",
    homepage: "https://usemycontext.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.usemycontext.ai/mcp"],
    },
  },
  {
    name: "jobyap",
    title: "JobYap",
    description:
      "Search job postings aggregated from companies' official careers sites — salaries, locations, and a community discussion thread on every job. Remote Streamable HTTP MCP server; no auth required.",
    icon: "https://raw.githubusercontent.com/jobyap/agent-skills/main/assets/logo.png",
    homepage: "https://jobyap.com/agents",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.jobyap.com/mcp"],
    },
  },
  {
    name: "tendem",
    title: "Tendem",
    description:
      "Delegate tasks to vetted human experts - research, competitive analysis, fact-checking, copywriting, editing, design review, presentation polish, data cleaning and list building. Submit a task in natural language; Tendem's orchestrator scopes it and quotes a transparent price, and after explicit approval a vetted human expert executes it and returns verified results as markdown plus files. Remote Streamable HTTP MCP server with OAuth 2.0 sign-in on first use.",
    icon: "https://framerusercontent.com/images/EGNlwavPB2tW8etz63vecfpJu0.png",
    homepage: "https://github.com/Toloka/tendem-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.tendem.ai/mcp?utm_hash=66fdb1535f"],
    },
  },
  {
    name: "structured",
    title: "Structured",
    description:
      "Structured is an all-in-one day planner that combines tasks and to-dos in a visual timeline. Its MCP server lets AI assistants view schedules and inbox tasks, and create, update, complete, delete, and manage recurring tasks. Remote Streamable HTTP server with Structured Cloud OAuth sign-in; some features require Structured Pro.",
    icon: "https://web.structured.app/logo512.png",
    homepage: "https://mcp.structured.app",
    configuration: {
      command: "npx",
      args: [
        "-y",
        "mcp-remote",
        "https://mcp.structured.app/mcp",
        "36933",
        "--transport",
        "http-only",
        "--static-oauth-client-info",
        '{"client_id":"4b33fb93-0eac-489f-974b-1a9fa108f4e9"}',
        "--static-oauth-client-metadata",
        '{"scope":"email"}',
      ],
    },
  },
  {
    name: "one",
    title: "One",
    description:
      "One is an MCP server that connects your AI tools to 700+ apps like Gmail, Slack, Stripe, Shopify, HubSpot, Notion, and Linear. Four tools cover everything: list your connected accounts, search a platform's actions, read an action's real API documentation, and execute it. Remote Streamable HTTP server with One OAuth sign-in, so no API keys are stored locally.",
    icon: "https://assets.withone.ai/logos/one-logo.png",
    homepage: "https://www.withone.ai/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.withone.ai/mcp"],
      env: {
        npm_config_yes: "true",
      },
    },
  },
  {
    name: "smart-me",
    title: "smart-me",
    description:
      "Your building's energy in real time: live meter readings, quarter-hourly load profiles and daily series, EV charging stations with their sessions and load-management groups, and the tariffs, invoice positions and ZEV (tenant) billing of a property on the smart-me platform. The remote Streamable HTTP server uses smart-me OAuth sign-in through an `mcp-remote` bridge.",
    icon: "https://web.smart-me.com/wp-content/uploads/2025/09/sm_favicon.png",
    homepage: "https://github.com/eCarUp/smart-me-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.smart-me.com/mcp"],
    },
  },
  {
    name: "audiopod",
    title: "AudioPod AI",
    description:
      "Audio AI as tools: text-to-speech in 200+ languages, voice cloning, voice conversion, music generation, stem and speaker separation, transcription with word-level timestamps, noise removal and media conversion. Remote Streamable HTTP server reached through an `mcp-remote` bridge and authenticated with an AudioPod API key.",
    icon: "https://audiopod.ai/logo/logo.png",
    homepage: "https://docs.audiopod.ai/sdks/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.audiopod.ai", "--header", "X-API-Key:${AUDIOPOD_API_KEY}"],
      env: {
        AUDIOPOD_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "bioflow",
    title: "BioFlow",
    description:
      "Edit and publish your link-in-bio page, its links and blocks, and read page analytics and signups from BioFlow. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/bioflow/assets/logo.png",
    homepage: "https://getbioflow.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.getbioflow.com/api/mcp"],
    },
  },
  {
    name: "dodomain",
    title: "DoDomain",
    description:
      "Connect customers' custom domains to your product: guided DNS setup, verification and certificates, managed from DoDomain. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/dodomain/assets/logo.png",
    homepage: "https://dodomain.io/docs/connecting-ai-assistants",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.dodomain.io/api/mcp"],
    },
  },
  {
    name: "getitdone",
    title: "GetItDone",
    description:
      "Create, update and track tasks and projects across your GetItDone team workspaces. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/getitdone/assets/logo.png",
    homepage: "https://nowgetitdone.com/docs/connecting-ai-assistants",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.nowgetitdone.com/api/mcp"],
    },
  },
  {
    name: "notifly",
    title: "Notifly",
    description:
      "Manage notification workflows, subscribers and topics, and trigger delivery across email, SMS, push, chat and in-app channels with Notifly. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/notifly/assets/logo.png",
    homepage: "https://notifly.io/developers",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.notifly.io/mcp"],
    },
  },
  {
    name: "postify",
    title: "Postify",
    description:
      "Draft, schedule and publish social media posts to your connected channels, and read post analytics, from your Postify calendar. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/postify/assets/logo.png",
    homepage: "https://usepostify.com/developers",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.usepostify.com/api/mcp"],
    },
  },
  {
    name: "sendly",
    title: "Sendly",
    description:
      "Send transactional email, run campaigns, and manage contacts, lists and segments in Sendly. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/sendly/assets/logo.png",
    homepage: "https://docs.sendly.now/guides/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.sendly.now/api/mcp"],
    },
  },
  {
    name: "nitrosend",
    title: "Nitrosend",
    description:
      "Compose email campaigns and automation flows, manage contacts and segments, send transactional email or SMS, and review delivery in Nitrosend. Hosted remote Streamable HTTP server; OAuth sign-in, no API key needed.",
    icon: "https://raw.githubusercontent.com/nitrosend/cursor/main/assets/logo.png",
    homepage: "https://docs.nitrosend.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.nitrosend.com/mcp"],
    },
    remoteUrl: "https://api.nitrosend.com/mcp",
  },
  {
    name: "shorty",
    title: "Shorty",
    description:
      "Summarize and transcribe videos, audio files, documents and web pages with Shorty. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/shorty/assets/logo.png",
    homepage: "https://aishorty.com/docs/connecting-ai-assistants",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://aishorty.com/api/mcp"],
    },
  },
  {
    name: "snapvisor",
    title: "SnapVisor",
    description:
      "Review visual regression builds, approve or reject screenshot changes, and manage SnapVisor projects. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/snapvisor/assets/logo.png",
    homepage: "https://snapvisor.io/docs",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.snapvisor.io/"],
    },
  },
  {
    name: "superbooks",
    title: "SuperBooks",
    description:
      "Work with your SuperBooks books: transactions and categories, invoices, customers, receipts, time tracking and financial reports. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/superbooks/assets/logo.png",
    homepage: "https://docs.superbooks.io/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.superbooks.io/mcp"],
    },
  },
  {
    name: "unotes",
    title: "uNotes",
    description:
      "Search a library of university course materials (past exams, assignments, lab reports, lecture notes) and your uNotes flashcards and quizzes. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/unotes/assets/logo.png",
    homepage: "https://unotes.net/docs",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://unotes.net/api/mcp"],
    },
  },
  {
    name: "upapi",
    title: "upAPI",
    description:
      "Call a catalog of ready-to-use APIs through one upAPI account and key, without signing up for each upstream service. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/upapi/assets/logo.png",
    homepage: "https://upapi.io/docs/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.upapi.io/api/mcp"],
    },
  },
  {
    name: "uptimely",
    title: "Uptimely",
    description:
      "Manage uptime monitors, incidents and status pages, and read check results, in Uptimely. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/uptimely/assets/logo.png",
    homepage: "https://getuptimely.com/integrations",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.getuptimely.com/api/mcp"],
    },
  },
  {
    name: "voicelabs",
    title: "VoiceLabs",
    description:
      "Generate speech from text in your voices and transcribe audio with VoiceLabs. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/voicelabs/assets/logo.png",
    homepage: "https://voicelabs.now/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.voicelabs.now/api/mcp"],
    },
  },
  {
    name: "zihin",
    title: "Zihin",
    description:
      "Build and operate AI agents on the Zihin platform: create agents and personas, attach API and MCP tools, configure webhook, schedule and email triggers, set budgets and human-approval policies, inspect runs and chat with your agents. Local stdio server `@zihin/mcp-server` (MIT) through `npx`; needs a Zihin API key in `ZIHIN_API_KEY`.",
    icon: "https://github.com/zihin-ai.png",
    homepage: "https://docs.zihin.ai/integrations/mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "@zihin/mcp-server"],
      env: {
        ZIHIN_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "caly",
    title: "Caly",
    description:
      "Find open meeting times, book, reschedule and cancel meetings, and read your event types, bookings and schedules in Caly. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.",
    icon: "https://raw.githubusercontent.com/DevinoSolutions/mcp-servers/main/caly/assets/logo.png",
    homepage: "https://trycaly.com/docs/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.trycaly.com/mcp"],
    },
  },
];

export const COMMUNITY_ENTRIES: RegistryEntry[] = [
  {
    name: "talk-to-figma",
    title: "Talk to Figma",
    description:
      "This project implements a Model Context Protocol (MCP) integration between Cursor AI and Figma, allowing Cursor to communicate with Figma for reading designs and modifying them programmatically.",
    icon: "https://svgl.app/library/figma.svg",
    homepage: "https://github.com/grab/cursor-talk-to-figma-mcp",
    configuration: {
      command: "bunx",
      args: ["cursor-talk-to-figma-mcp@latest"],
    },
  },
  {
    name: "agentmailkit",
    title: "AgentMailKit",
    description:
      "Email job runner for agents. Tools: list_jobs, run_job, preview_job, list_plugins. Email sends are defined as named jobs, run_job renders a preview and defaults to dry_run true, and delivery happens only when dry_run is set false. SMTP credentials come from the environment.",
    icon: "https://github.com/ariaxhan.png",
    homepage: "https://github.com/ariaxhan/agentmailkit",
    configuration: {
      command: "uvx",
      args: ["--from", "agentmailkit[mcp]", "agentmailkit", "mcp"],
    },
  },
  {
    name: "airbnb",
    title: "Airbnb",
    description: "MCP Server for searching Airbnb and get listing details.",
    icon: "https://svgl.app/library/airbnb.svg",
    homepage: "https://github.com/openbnb-org/mcp-server-airbnb",
    configuration: {
      command: "npx",
      args: ["-y", "@openbnb/mcp-server-airbnb", "--ignore-robots-txt"],
    },
  },
  {
    name: "airtable",
    title: "Airtable",
    description:
      "A Model Context Protocol server that provides read and write access to Airtable databases. This server enables LLMs to inspect database schemas, then read and write records.",
    icon: "airtable.svg",
    homepage: "https://github.com/domdomegg/airtable-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "airtable-mcp-server"],
      env: {
        AIRTABLE_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
  },
  {
    name: "alai",
    title: "Alai",
    description:
      "Generate, edit, and export high-quality AI presentations to PDF, PPTX, or a shareable link. Supports themes, vibes, and creative slide variants.",
    icon: "https://storage.getalai.com/Alai%20Logo%20-%20Gradient%20BG.png",
    homepage: "https://getalai.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://slides-api.getalai.com/mcp/"],
    },
  },
  {
    name: "apple-script",
    title: "Apple Script",
    description:
      "A Model Context Protocol (MCP) server that lets you run AppleScript code to interact with Mac. This MCP is intentionally designed to be simple, straightforward, intuitive, and require minimal setup.",
    icon: "applescript.png",
    homepage: "https://github.com/peakmojo/applescript-mcp",
    configuration: {
      command: "npx",
      args: ["@peakmojo/applescript-mcp"],
    },
  },
  {
    name: "bandcamp",
    title: "Bandcamp",
    description:
      "Dig Bandcamp without an account or API key: search artists, albums, labels and tracks, browse genre tags for new and top releases, read tracklists and prices. Unofficial; read-only, local stdio server.",
    icon: "https://raw.githubusercontent.com/Venut-Technologies/bandcamp-mcp/main/assets/icon.png",
    homepage: "https://github.com/Venut-Technologies/bandcamp-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "bandcamp-mcp"],
    },
  },
  {
    name: "basic-memory",
    title: "Basic Memory",
    description:
      "Basic Memory lets you build persistent knowledge through natural conversations with Large Language Models (LLMs) like Claude, while keeping everything in simple Markdown files on your computer. It uses the Model Context Protocol (MCP) to enable any compatible LLM to read and write to your local knowledge base.",
    icon: Icon.MemoryStick,
    homepage: "https://github.com/basicmachines-co/basic-memory",
    configuration: {
      command: "uvx",
      args: ["basic-memory", "mcp"],
    },
  },
  {
    name: "big-query",
    title: "BigQuery",
    description:
      "A Model Context Protocol server that provides access to BigQuery. This server enables LLMs to inspect database schemas and execute queries.",
    icon: "bigquery.svg",
    homepage: "https://github.com/LucasHild/mcp-server-bigquery",
    configuration: {
      command: "uvx",
      args: ["mcp-server-bigquery", "--project", "YOUR_PROJECT_ID", "--location", "YOUR_LOCATION"],
    },
  },
  {
    name: "clickup",
    title: "ClickUp",
    description:
      "A Model Context Protocol (MCP) server for integrating ClickUp tasks with AI applications. This server allows AI agents to interact with ClickUp tasks, spaces, lists, and folders through a standardized protocol.",
    icon: "clickup.svg",
    homepage: "https://github.com/TaazKareem/clickup-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "@taazkareem/clickup-mcp-server@latest"],
      env: {
        CLICKUP_API_KEY: "YOUR_API_KEY_HERE",
        CLICKUP_TEAM_ID: "YOUR_TEAM_ID_HERE",
        DOCUMENT_SUPPORT: "true",
      },
    },
  },
  {
    name: "contracko",
    title: "Contracko",
    description:
      "AI contract management. Review contracts for risks and obligations, extract dates, parties and values, search inside documents, and track renewal deadlines. Connects to the remote Contracko MCP server over OAuth 2.1.",
    icon: "https://app.contracko.com/mcp/icon-512.png",
    homepage: "https://contracko.com/docs/mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.contracko.com/mcp"],
    },
  },
  {
    name: "discord",
    title: "Discord",
    description:
      "A Model Context Protocol (MCP) server for the Discord API (JDA), allowing seamless integration of Discord Bot with MCP-compatible applications like Claude Desktop. Enable your AI assistants to seamlessly interact with Discord. Manage channels, send messages, and retrieve server information effortlessly. Enhance your Discord experience with powerful automation capabilities.",
    icon: "https://svgl.app/library/discord.svg",
    homepage: "https://github.com/SaseQ/discord-mcp",
    configuration: {
      command: "npx",
      args: ["mcp-remote", "https://gitmcp.io/SaseQ/discord-mcp"],
      env: {
        DISCORD_TOKEN: "YOUR_DISCORD_BOT_TOKEN",
      },
    },
  },
  {
    name: "engine-dj",
    title: "Engine DJ",
    description:
      "Search, audit and build playlists in your Engine DJ (Denon) library: BPM and Camelot key search, duplicate and missing-file audits, cues and beatgrids, opt-in playlist and tag edits. Unofficial; local stdio server, macOS.",
    icon: "https://raw.githubusercontent.com/Venut-Technologies/engine-dj-mcp/main/assets/icon.png",
    homepage: "https://github.com/Venut-Technologies/engine-dj-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "engine-dj-mcp"],
    },
  },
  {
    name: "firebase",
    title: "Firebase",
    description: "Firebase MCP enables AI assistants to work directly with Firebase services.",
    icon: "https://svgl.app/library/firebase.svg",
    homepage: "https://github.com/gannonh/firebase-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@gannonh/firebase-mcp"],
      env: {
        SERVICE_ACCOUNT_KEY_PATH: "/absolute/path/to/serviceAccountKey.json",
        FIREBASE_STORAGE_BUCKET: "your-project-id.firebasestorage.app",
      },
    },
  },
  {
    name: "ghost",
    title: "Ghost",
    description:
      "A Model Context Protocol (MCP) server for interacting with Ghost CMS through LLM interfaces like Claude. This server provides secure and comprehensive access to your Ghost blog, leveraging JWT authentication and a rich set of MCP tools for managing posts, users, members, tiers, offers, and newsletters.",
    icon: {
      source: "ghost.png",
      tintColor: Color.PrimaryText,
    },
    homepage: "https://github.com/MFYDev/ghost-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@fanyangmeng/ghost-mcp"],
      env: {
        GHOST_API_URL: "https://yourblog.com",
        GHOST_ADMIN_API_KEY: "your_admin_api_key",
        GHOST_API_VERSION: "v5.0",
      },
    },
  },
  {
    name: "iterm",
    title: "iTerm",
    description: "A Model Context Protocol server that provides access to your iTerm session.",
    icon: "iterm.svg",
    homepage: "https://github.com/ferrislucas/iterm-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "iterm-mcp"],
    },
  },
  {
    name: "kordoc",
    title: "kordoc",
    description:
      "Parse Korean and office documents into Markdown and structured data: HWP 3.x/5.x, HWPX, HWPML, PDF, DOCX, XLS/XLSX, PPTX and PNG/JPG/WebP images. Also compares two documents, fills forms, applies format-preserving HWPX/HWP patches, generates HWPX from Markdown and renders previews. 17 tools that work on local file paths. Local stdio server from the `kordoc` npm package (MIT) through `npx`; no API key, Node.js 20+.",
    icon: "https://github.com/chrisryugj.png",
    homepage: "https://github.com/chrisryugj/kordoc",
    configuration: {
      command: "npx",
      args: ["-y", "kordoc", "mcp"],
    },
  },
  {
    name: "korean-law",
    title: "Korean Law MCP",
    description:
      "Search and read Korean law through the official Open API of Korea's Ministry of Government Legislation (법제처): statutes, precedents, administrative rules, local ordinances, treaties and legal interpretations, plus citation verification that checks statute and precedent citations in AI-written answers against the official database. 10 tools. Hosted remote Streamable HTTP server at https://mcp.gomdori.app/law; it works without a key through a shared, rate-limited key, or add your own free 법제처 Open API key as `?oc=YOUR_KEY`. Open source (MIT).",
    icon: "https://github.com/chrisryugj.png",
    homepage: "https://github.com/chrisryugj/korean-law-mcp",
    remoteUrl: "https://mcp.gomdori.app/law",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.gomdori.app/law"],
    },
  },
  {
    name: "kyma",
    title: "Kyma API",
    description:
      "Kyma API's hosted MCP server: browse the live model catalog and pricing, check measured per-model uptime and public usage rankings, view your own credits and spend, and chat through a tool guarded by a spend cap you set. OAuth 2.1 sign-in, no key pasted into the client.",
    icon: "https://raw.githubusercontent.com/kyma-api/kyma-mcp-plugin/main/assets/logo-400.png",
    homepage: "https://kymaapi.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@kyma-api/mcp-server"],
    },
  },
  {
    name: "lightdash",
    title: "Lightdash",
    description:
      "This server provides MCP-compatible access to Lightdash's API, allowing AI assistants to interact with your Lightdash data through a standardized interface.",
    icon: {
      source: "lightdash.svg",
      tintColor: Color.PrimaryText,
    },
    homepage: "https://github.com/syucream/lightdash-mcp-server",
    configuration: {
      command: "npx",
      args: ["-y", "lightdash-mcp-server"],
      env: {
        LIGHTDASH_API_KEY: "YOUR_API_KEY_HERE",
        LIGHTDASH_API_URL: "https://<your base url>",
      },
    },
  },
  {
    name: "llmslim",
    title: "LLMSlim",
    description:
      "Long-term memory for agents with no LLM call. Tools: remember, recall, list_memories, forget, fit_context. Messages are stored word for word in a local SQLite file (or Postgres), and recall returns the ones that answer a question within a token budget. The user and agent scope is fixed when the server starts, not chosen by the model. Local stdio server, no API key. MIT.",
    icon: "https://raw.githubusercontent.com/Thanatos9404/llmslim/main/web/public/icon-512.png",
    homepage: "https://github.com/Thanatos9404/llmslim",
    configuration: {
      command: "uvx",
      args: ["--from", "llmslim[mcp]", "llmslim", "mcp"],
    },
  },
  {
    name: "memo",
    title: "memo",
    description:
      "Local-first persistent memory for AI agents. MLX embeddings on Apple Silicon (CPU fallback elsewhere), sqlite-vec + BM25 hybrid search, and markdown-on-disk storage compatible with Obsidian. No cloud APIs or accounts required.",
    icon: "https://raw.githubusercontent.com/jagoff/memo/master/docs/logo-400.png",
    homepage: "https://github.com/jagoff/memo",
    configuration: {
      command: "uvx",
      args: ["--from", "mlx-memo", "memo-mcp"],
    },
  },
  {
    name: "metabrain",
    title: "Metabrain",
    description:
      "Persistent memory for coding agents. Tools: learn, recall, verdict, hypotheses, start_brief, stats, capture_error. Lessons, failures and hypotheses are written to a local SQLite file and retrieved by keyword before the next task. No API key and no network call.",
    icon: "https://github.com/ariaxhan.png",
    homepage: "https://github.com/ariaxhan/metabrain",
    configuration: {
      command: "uvx",
      args: ["--from", "metabrain[mcp]", "metabrain-mcp", "--db", METABRAIN_DB_PATH],
    },
  },
  {
    name: "monday",
    title: "Monday",
    description:
      "MCP Server for monday.com, enabling MCP clients to interact with Monday.com boards, items, updates, and documents.",
    icon: "monday.svg",
    homepage: "https://github.com/Prat011/mcp-server-monday",
    configuration: {
      command: "uvx",
      args: ["mcp-server-monday"],
      env: {
        MONDAY_API_KEY: "your-monday-api-key",
        MONDAY_WORKSPACE_NAME: "your-monday-workspace-name",
      },
    },
  },
  {
    name: "neither",
    title: "Neither",
    description:
      "Project context your AI can query through MCP. Use selected notes and documents in Cursor or Claude Desktop, retrieve related context, and inspect the source evidence. Local stdio · Node 20+.",
    icon: Icon.MemoryStick,
    homepage: "https://www.neither.online/start/?product=dev",
    configuration: {
      command: "npx",
      args: ["-y", "@neitherai/mcp-server@latest"],
      env: {
        NEITHER_API_KEY: "YOUR_WORKSPACE_KEY",
        NEITHER_API_BASE: "https://api.neither.online",
      },
    },
  },
  {
    name: "nika",
    title: "Nika",
    description:
      "Nika is a workflow language for AI — one file, four verbs, one Rust binary. Its MCP server is a read-only oracle: agents validate workflows (nika_check, nika_explain) and learn the language (schema, templates, examples, catalogs) without executing anything. Running stays on the CLI, budget-capped and trace-verified — inspect freely, execute deliberately.",
    icon: "https://github.com/supernovae-st.png",
    homepage: "https://github.com/supernovae-st/nika",
    configuration: {
      command: "nika",
      args: ["mcp"],
    },
  },
  {
    name: "optionsahoy",
    title: "OptionsAhoy",
    description:
      "Equity-compensation tax optimizer. ISO/AMT exercise scheduling, NSO, RSU sell-vs-hold, QSBS eligibility, single-stock concentration risk, and protective puts/collars, computed against federal plus 50-state and DC tax code over multi-year horizons.",
    icon: "https://raw.githubusercontent.com/AlvisoOculus/optionsahoy-mcp/main/assets/logo-400.png",
    homepage: "https://optionsahoy.com/for-agents",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://optionsahoy.com/mcp"],
    },
  },
  {
    name: "opus-growth",
    title: "Opus Growth",
    description:
      "Manage ads from chat across Google, Meta, Microsoft, TikTok and LinkedIn: create and optimize campaigns, ad groups, creatives, audiences, bidding, keywords and extensions, plus reporting and SEO with Search Console, GA4, GTM, Google Business Profile and YouTube. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste.",
    icon: "https://raw.githubusercontent.com/opusgrowth/Opus-Growth-The-MCP-Connector-for-Ad-Platforms/main/assets/opus-growth-icon-orange-400.png",
    homepage: "https://opus-growth.com",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.opus-growth.com/mcp"],
    },
  },
  {
    name: "paperless-ngx",
    title: "Paperless-NGX",
    description:
      "An MCP server for interacting with a Paperless-NGX API server. Manage documents, tags, correspondents, and document types in your Paperless-NGX instance.",
    icon: "https://icons.duckduckgo.com/ip3/paperless-ngx.com.ico",
    homepage: "https://github.com/baruchiro/paperless-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@baruchiro/paperless-mcp@latest"],
      env: {
        PAPERLESS_URL: "http://your-paperless-instance:8000",
        PAPERLESS_API_KEY: "your-api-token",
      },
    },
  },
  {
    name: "recordist",
    title: "Recordist",
    description:
      "Read, search and act on the meetings Recordist recorded on your own computer: transcripts, notes, action items and recording controls. Talks only to the Recordist app on 127.0.0.1; what it returns goes to the AI assistant you connect.",
    icon: "https://recordist.app/brand/mark.svg",
    homepage: "https://github.com/recordist-app/gateway",
    configuration: {
      command: "npx",
      args: ["-y", "@recordist/gateway"],
    },
  },
  {
    name: "search-fragments",
    title: "Search Fragments",
    description:
      "Resolves half-remembered books, films, songs and people into a cited answer, a shortlist or an explicit no. Built to decline rather than guess. Also checks specific factual claims against current web sources. Remote Streamable HTTP server at https://searchfragments.com/api/mcp; no sign-in, no API key.",
    icon: "https://searchfragments.com/icon-512.png",
    homepage: "https://searchfragments.com",
    remoteUrl: "https://searchfragments.com/api/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://searchfragments.com/api/mcp"],
    },
  },
  {
    name: "serato-dj",
    title: "Serato DJ",
    description:
      "Search and audit your Serato DJ library: harmonic BPM and Camelot key search, crates, duplicate and missing-file audits, and new crates built with a preview before anything is written. Unofficial; local stdio server, macOS.",
    icon: "https://raw.githubusercontent.com/Venut-Technologies/serato-dj-mcp/main/assets/icon.png",
    homepage: "https://github.com/Venut-Technologies/serato-dj-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "serato-dj-mcp"],
    },
  },
  {
    name: "shopify-speed-check",
    title: "Shopify Speed Check",
    description:
      "Check any Shopify store's PageSpeed and Core Web Vitals, find slow apps and scripts, and compare Shopify plan fees.",
    homepage: "https://www.skaidigital.com/tools/shopify-speed-test",
    remoteUrl: "https://tools.skaidigital.com/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://tools.skaidigital.com/mcp"],
    },
  },
  {
    name: "site-spec",
    title: "Site Spec",
    description:
      "Website audit and repair. Tools: audit_site, fix_issue, compile_spec, list_checks. 40 checks across SEO, accessibility, privacy, structured data and AI searchability, each finding returned with the file and the fix. No API key required.",
    icon: "https://github.com/ariaxhan.png",
    homepage: "https://github.com/ariaxhan/site-spec",
    configuration: {
      command: "npx",
      args: ["-y", "site-spec-mcp"],
    },
  },
  {
    name: "stellary",
    title: "Stellary",
    description:
      "AI-native project piloting and project management (open beta). Connect your AI assistant to Stellary workspaces through the hosted Streamable HTTP MCP server. Bearer PAT required.",
    icon: "https://raw.githubusercontent.com/Anymfah/stellary-mcp/main/assets/logo-400.png",
    homepage: "https://stellary.co/docs/mcp/",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://api.stellary.co/mcp", "--header", "Authorization: Bearer YOUR_API_KEY"],
    },
  },
  {
    name: "vc-deal-flow-signal",
    title: "VC Deal Flow Signal",
    description:
      "GitHub-derived engineering acceleration signals for ~400 venture-backed startups across 20 sectors. Five read-only tools for VC sourcing — trending startups, sector lookup, individual signal, dataset summary, methodology. No API key required.",
    icon: "https://signals.gitdealflow.com/icon.png",
    homepage: "https://github.com/kindrat86/vc-deal-flow-signal",
    configuration: {
      command: "npx",
      args: ["-y", "@gitdealflow/mcp-signal@latest"],
    },
  },
  {
    name: "vibe-prospecting",
    title: "Vibe Prospecting",
    description:
      "Power your chat with live B2B data to create lead lists, research companies, enrich contacts, personalize outreach, and inspect business signals, technology stacks, events, and website changes.",
    icon: "https://raw.githubusercontent.com/explorium-ai/vibeprospecting-plugin/main/assets/icon.png",
    homepage: "https://vibeprospecting.ai",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://vibeprospecting.explorium.ai/mcp"],
    },
  },
  {
    name: "wealthnow",
    title: "Wealthnow",
    description:
      "Institutional financial data for AI agents: FINRA TRACE corporate bond prints and single-name CDS history, private company rounds, valuations and investors, daily options chains with greeks and IV, earnings-call transcripts, 13F and Form 4 ownership, and point-in-time fundamentals and SEC filings. Every tool is read-only; nothing places orders or moves money. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste; free Wealthnow account. Data only, not investment advice.",
    icon: "https://raw.githubusercontent.com/Hlobo-dev/wealthnow-mcp/main/assets/wealthnow-logo-512.png",
    homepage: "https://wealthnow.io/api",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.wealthnow.io/mcp"],
    },
    remoteUrl: "https://mcp.wealthnow.io/mcp",
  },
  {
    name: "empiriolabs",
    title: "EmpirioLabs AI",
    description:
      "Run 180+ AI models, image, video and speech generation, web search and research with citations, batch jobs, GPU Cloud and hosted agents as tools. Remote Streamable HTTP server with OAuth 2.1 sign-in through mcp-remote; an EmpirioLabs API key works as a bearer token too.",
    icon: "https://empiriolabs.ai/images/icon-dark-512.png",
    homepage: "https://docs.empiriolabs.ai/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.empiriolabs.ai/mcp"],
    },
  },
  {
    name: "linkmcp",
    title: "LinkMCP",
    description:
      "Use your own LinkedIn account from your AI assistant: look up profiles and companies, search people, jobs and Sales Navigator (with your own seat), read and send LinkedIn messages, read and write posts, comments and reactions, manage connection requests, read your own post analytics, and find work emails and mobile numbers. Not affiliated with LinkedIn. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste. 7-day free trial without a card; connecting a LinkedIn account needs a paid plan (from $19/month).",
    icon: "https://app.linkmcp.io/logo-512.png",
    homepage: "https://app.linkmcp.io",
    remoteUrl: "https://app.linkmcp.io/api/mcp?ref=raycast",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://app.linkmcp.io/api/mcp?ref=raycast"],
    },
  },
  {
    name: "miningbridge",
    title: "MiningBridge Intelligence",
    description:
      "Critical-mineral and rare-earth trade intelligence: commodity snapshots, UN Comtrade trade flows, supplier screening, supply-risk scores, evidence search and MiningBridge market reports. Nine read-only tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with your MiningBridge account (dynamic client registration and PKCE), no API key to paste. Free plan with headline figures; paid plans add full reports. Figures are screening magnitudes, not investment advice.",
    icon: "https://intel.miningbridge.in/icon.png",
    homepage: "https://intel.miningbridge.in/connect",
    remoteUrl: "https://intel.miningbridge.in/api/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://intel.miningbridge.in/api/mcp"],
    },
  },
  {
    name: "aitho",
    title: "Aitho",
    description:
      "Rehearse and deliver presentations with your own slides: create a talk from a PDF or PowerPoint deck, attach a speaker script, start a presentation and move between slides, and ask questions answered from your own material. Hosted remote Streamable HTTP server; OAuth sign-in with dynamic client registration and PKCE. Free plan; paid plans for more.",
    icon: "https://aitho.app/icon-512.png",
    homepage: "https://aitho.app",
    remoteUrl: "https://present.aitho.app/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://present.aitho.app/mcp"],
    },
  },
  {
    name: "flowra",
    title: "Flowra",
    description:
      "One MCP server for your apps' tools and your own custom tools, plus hosted AI agents and workflows with approval gates and a run ledger.",
    icon: "https://flowra.dev/icons/logo.svg",
    homepage: "https://flowra.dev",
    remoteUrl: "https://mcp.flowra.dev/mcp",
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.flowra.dev/mcp"],
    },
  },
];
