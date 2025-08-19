import { Color, Icon } from "@raycast/api";
import type { RegistryEntry } from "./types";

export const OFFICIAL_ENTRIES: RegistryEntry[] = [
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
    name: "e2b",
    title: "E2B Code Interpreter",
    description: "A Model Context Protocol server for running code in a secure sandbox by [E2B](https://e2b.dev/).",
    icon: {
      source: "e2b.svg",
      tintColor: Color.PrimaryText,
    },
    homepage: "https://github.com/e2b-dev/mcp-server/blob/main/packages/js/README.md",
    configuration: {
      command: "npx",
      args: ["-y", "@e2b/mcp-server"],
      env: {
        E2B_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
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
    name: "google-drive",
    title: "Google Drive",
    description: "This MCP server integrates with Google Drive to allow listing, reading, and searching over files.",
    icon: "https://svgl.app/library/drive.svg",
    homepage: "https://github.com/modelcontextprotocol/servers-archived/tree/main/src/gdrive",
    configuration: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-gdrive"],
      env: {
        GDRIVE_CREDENTIALS_PATH: "/path/to/.gdrive-server-credentials.json",
      },
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
    name: "perplexity",
    title: "Perplexity",
    description:
      "An MCP server implementation that integrates the Sonar API to provide Claude with unparalleled real-time, web-wide research.",
    icon: "https://svgl.app/library/perplexity.svg",
    homepage: "https://github.com/ppl-ai/modelcontextprotocol",
    configuration: {
      command: "npx",
      args: ["-y", "server-perplexity-ask"],
      env: {
        PERPLEXITY_API_KEY: "YOUR_API_KEY_HERE",
      },
    },
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
    name: "shopify-dev",
    title: "Shopify Dev",
    description:
      "MCP server that interacts with Shopify Dev. This protocol supports various tools to interact with different Shopify APIs.",
    icon: "shopify.svg",
    homepage: "https://github.com/Shopify/dev-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@shopify/dev-mcp@latest"],
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
    homepage: "https://github.com/stripe/agent-toolkit",
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
    name: "firecrawl",
    title: "Firecrawl",
    description:
      "A Model Context Protocol (MCP) server implementation that integrates with Firecrawl for web scraping capabilities.",
    icon: "🔥",
    homepage: "https://github.com/mendableai/firecrawl-mcp-server",
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
      "Official ElevenLabs Model Context Protocol (MCP) server that enables interaction with powerful Text to Speech and audio processing APIs. This server allows MCP clients like Claude Desktop, Cursor, Windsurf, OpenAI Agents and others to generate speech, clone voices, transcribe audio, and more.",
    icon: {
      source: "elevenlabs.svg",
      tintColor: Color.PrimaryText,
    },
    homepage: "https://github.com/elevenlabs/elevenlabs-mcp",
    configuration: {
      command: "uvx",
      args: ["elevenlabs-mcp"],
      env: {
        ELEVENLABS_API_KEY: "YOUR_API_KEY_HERE",
      },
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
    description: "Access Nuxt documentation and modules with the public Nuxt MCP server",
    icon: "nuxt.svg",
    homepage: "https://mcp.nuxt.com/",
    configuration: {
      command: "npx",
      args: ["mcp-remote", "https://mcp.nuxt.space/sse"],
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
      "A Model Context Protocol (MCP) server for Anytype that enables AI assistants to seamlessly interact with Anytype's API through natural language. Manage spaces, objects, properties, types and more in your knowledge base.",
    icon: "anytype.png",
    homepage: "https://github.com/anyproto/anytype-mcp",
    configuration: {
      command: "npx",
      args: ["-y", "@anyproto/anytype-mcp"],
      env: {
        OPENAPI_MCP_HEADERS: '{"Authorization":"Bearer <YOUR_API_KEY>", "Anytype-Version":"2025-05-20"}',
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
    configuration: {
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
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
    homepage: "https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp",
    configuration: {
      command: "bunx",
      args: ["cursor-talk-to-figma-mcp@latest"],
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
    name: "monday",
    title: "Monday",
    description:
      "MCP Server for monday.com, enabling MCP clients to interact with Monday.com boards, items, updates, and documents.",
    icon: "monday.svg",
    homepage: "https://github.com/sakce/mcp-server-monday",
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
];
