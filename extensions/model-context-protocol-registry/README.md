# Model Context Protocol Registry

This extension is a meta registry for MCP servers. It is used to discover and install MCP servers. You can install servers in Raycast but also other clients that support MCP such as Claude or Cursor.

## How to contribute?

There are three ways you can contribute to the registry:

1. Add a new MCP server to the registry.
2. Add a new MCP client to the registry.
3. Add a new MCP registry to the registry.

### Add a new MCP server to the registry

To add a new MCP server to the registry, you need to create a new entry in the `src/registries/builtin/entries.ts` file. You can add to the `OFFICIAL_ENTRIES` or `COMMUNITY_ENTRIES` array. Former is used for servers that are officially supported by the companies or makers of the service. Latter is used for community servers.

### Add a new MCP client to the registry

To add a new MCP client to the registry, you need to create a new entry in the `src/shared/mcp.ts` file. You can add to the `SUPPORTED_CLIENTS` array.

### Add a new MCP registry to the registry

To add a new MCP registry to the registry, you need to create a new entry in the `src/registries/index.ts` file. The registry is a function that returns a React component. You can add to the `REGISTRIES` array. A simple example are the built-in registries: `OfficialRegistry` and `CommunityRegistry`. A more complex example is the `SmitheryRegistry` that is used to discover MCP servers from the [Smithery](https://smithery.ai) registry.

## MCP Servers

<!-- MCP_SERVERS_START -->

### Official MCP Servers

| Title | Description |
|-------|-------------|
| [Brave Search](https://github.com/modelcontextprotocol/servers/tree/HEAD/src/brave-search) | A Model Context Protocol server for Brave Search. This server provides tools to read, search, and manipulate Brave Search repositories via Large Language Models. |
| [Chroma](https://github.com/chroma-core/chroma-mcp) | This server provides data retrieval capabilities powered by Chroma, enabling AI models to create collections over generated data and user inputs, and retrieve that data using vector search, full text search, metadata filtering, and more. |
| [Context 7](https://github.com/upstash/context7) | Context7 MCP pulls up-to-date, version-specific documentation and code examples straight from the source — and places them directly into your prompt. |
| [Git](https://github.com/modelcontextprotocol/servers/tree/main/src/git) | A Model Context Protocol server for Git repository interaction and automation. This server provides tools to read, search, and manipulate Git repositories via Large Language Models. |
| [GitHub](https://github.com/github/github-mcp-server?utm_source=Blog&utm_medium=GitHub&utm_campaign=proplus&utm_notesblogtop) | The GitHub MCP Server is a Model Context Protocol (MCP) server that provides seamless integration with GitHub APIs, enabling advanced automation and interaction capabilities for developers and tools. |
| [GitLab](https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab) | MCP Server for the GitLab API, enabling project management, file operations, and more. |
| [E2B Code Interpreter](https://github.com/e2b-dev/mcp-server/blob/main/packages/js/README.md) | A Model Context Protocol server for running code in a secure sandbox by [E2B](https://e2b.dev/). |
| [Exa](https://github.com/exa-labs/exa-mcp-server) | A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way. |
| [Google Drive](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive) | This MCP server integrates with Google Drive to allow listing, reading, and searching over files. |
| [JetBrains](https://github.com/JetBrains/mcp-jetbrains) | The server proxies requests from client to JetBrains IDE. |
| [Heroku](https://github.com/heroku/heroku-mcp-server) | The Heroku Platform MCP Server is a specialized Model Context Protocol (MCP) implementation designed to facilitate seamless interaction between large language models (LLMs) and the Heroku Platform. This server provides a robust set of tools and capabilities that enable LLMs to read, manage, and operate Heroku Platform resources. |
| [Kagi Search](https://github.com/kagisearch/kagimcp) | The Official Model Context Protocol (MCP) server for Kagi search & other tools. |
| [Keboola](https://github.com/keboola/mcp-server) | Keboola MCP Server is an open-source bridge between your Keboola project and modern AI tools. It turns Keboola features—like storage access, SQL transformations, and job triggers—into callable tools for Claude, Cursor, CrewAI, LangChain, Amazon Q, and more. |
| [Filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) | Node.js server implementing Model Context Protocol (MCP) for filesystem operations. The server will only allow operations within directories specified via args. |
| [Paddle](https://github.com/PaddleHQ/paddle-mcp-server) | Paddle Billing is the developer-first merchant of record. We take care of payments, tax, subscriptions, and metrics with one unified API that does it all. This is a Model Context Protocol (MCP) server that provides tools for interacting with the Paddle API. |
| [Perplexity](https://github.com/ppl-ai/modelcontextprotocol) | An MCP server implementation that integrates the Sonar API to provide Claude with unparalleled real-time, web-wide research. |
| [Prisma](https://www.prisma.io/docs/postgres/integrations/mcp-server) | An MCP server that provisions and manages a Prisma Postgres database for your apps, so you don’t have to spend time fiddling with db infrastructure. |
| [Sentry](https://mcp.sentry.dev/) | This service provides a Model Context Provider (MCP) for interacting with Sentry's API. |
| [Shopify Dev](https://github.com/Shopify/dev-mcp) | MCP server that interacts with Shopify Dev. This protocol supports various tools to interact with different Shopify APIs. |
| [Slack](https://github.com/modelcontextprotocol/servers/tree/main/src/slack) | This service provides a Model Context Provider (MCP) for interacting with Slack's API. |
| [Square](https://github.com/square/square-mcp-server) | This project follows the Model Context Protocol standard, allowing AI assistants to interact with Square's connect API. |
| [Stripe](https://github.com/stripe/agent-toolkit) | This project follows the Model Context Protocol standard, allowing AI assistants to interact with Stripe's API. |
| [Supabase](https://supabase.com/docs/guides/getting-started/mcp) | This project follows the Model Context Protocol standard, allowing AI assistants to interact with Supabase's API. |
| [Tavily](https://github.com/tavily-ai/tavily-mcp) | This project follows the Model Context Protocol standard, allowing AI assistants to interact with Tavily's API. |
| [Thena](https://thena.ai) | A Model Context Protocol server that enables AI assistants to interact with Thena's services, providing seamless integration and enhanced capabilities for AI-powered applications. |
| [Xero](https://github.com/XeroAPI/xero-mcp-server) | This is a Model Context Protocol (MCP) server implementation for Xero. It provides a bridge between the MCP protocol and Xero's API, allowing for standardized access to Xero's accounting and business features. |
| [Firecrawl](https://github.com/mendableai/firecrawl-mcp-server) | A Model Context Protocol (MCP) server implementation that integrates with Firecrawl for web scraping capabilities. |
| [Playwright](https://github.com/microsoft/playwright-mcp) | A Model Context Protocol server that provides browser automation capabilities using Playwright. This server enables LLMs to interact with web pages through structured accessibility snapshots, bypassing the need for screenshots or visually-tuned models. |
| [Notion](https://github.com/makenotion/notion-mcp-server) | The Notion MCP Server is a Model Context Protocol (MCP) server that provides seamless integration with Notion APIs, enabling advanced automation and interaction capabilities for developers and tools. |
| [Pydantic Run Python](https://ai.pydantic.dev/mcp/run-python/) | The MCP Run Python package is an MCP server that allows agents to execute Python code in a secure, sandboxed environment. It uses Pyodide to run Python code in a JavaScript environment with Deno, isolating execution from the host system. |
| [Pydantic Logfire](https://github.com/pydantic/logfire-mcp) | This repository contains a Model Context Protocol (MCP) server with tools that can access the OpenTelemetry traces and metrics you've sent to Logfire. This MCP server enables LLMs to retrieve your application's telemetry data, analyze distributed traces, and make use of the results of arbitrary SQL queries executed using the Logfire APIs. |
| [Polar](https://docs.polar.sh/integrate/mcp) | Extend the capabilities of your AI Agents with Polar as MCP Server |
| [ElevenLabs](https://github.com/elevenlabs/elevenlabs-mcp) | Official ElevenLabs Model Context Protocol (MCP) server that enables interaction with powerful Text to Speech and audio processing APIs. This server allows MCP clients like Claude Desktop, Cursor, Windsurf, OpenAI Agents and others to generate speech, clone voices, transcribe audio, and more. |
| [Apify](https://mcp.apify.com) | A Model Context Protocol (MCP) server for Apify enabling AI agents to use 5,000+ ready-made Actors for use cases such as extracting data from websites, social media, search engines, online maps, and more. |
| [Nuxt](https://mcp.nuxt.com/) | Access Nuxt documentation and modules with the public Nuxt MCP server |
| [Zeabur](https://zeabur.com/docs/en-US/mcp) | Zeabur provides an official Model Context Protocol (MCP) server that allows you to manage and deploy your Zeabur projects. |
| [Grafana](https://github.com/grafana/mcp-grafana) | Official Grafana MCP server that provides seamless integration with Grafana APIs, enabling monitoring, visualization, and observability capabilities for developers and tools. |
| [Anytype](https://github.com/anyproto/anytype-mcp) | A Model Context Protocol (MCP) server for Anytype that enables AI assistants to seamlessly interact with Anytype's API through natural language. Manage spaces, objects, properties, types and more in your knowledge base. |
| [Gen-PDF](https://gen-pdf.com) | MCP server to generate professional looking PDF. Perfect for creating reports, invoices, contracts, and more. |
| [Linear](https://linear.app/docs/mcp) | The Model Context Protocol (MCP) server provides a standardized interface that allows any compatible AI model or agent to access your Linear data in a simple and secure way. The Linear MCP server has tools available for finding, creating, and updating objects in Linear like issues, projects, and comments. |
### Community MCP Servers

| Title | Description |
|-------|-------------|
| [Talk to Figma](https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp) | This project implements a Model Context Protocol (MCP) integration between Cursor AI and Figma, allowing Cursor to communicate with Figma for reading designs and modifying them programmatically. |
| [Airbnb](https://github.com/openbnb-org/mcp-server-airbnb) | MCP Server for searching Airbnb and get listing details. |
| [Airtable](https://github.com/domdomegg/airtable-mcp-server) | A Model Context Protocol server that provides read and write access to Airtable databases. This server enables LLMs to inspect database schemas, then read and write records. |
| [Apple Script](https://github.com/peakmojo/applescript-mcp) | A Model Context Protocol (MCP) server that lets you run AppleScript code to interact with Mac. This MCP is intentionally designed to be simple, straightforward, intuitive, and require minimal setup. |
| [Basic Memory](https://github.com/basicmachines-co/basic-memory) | Basic Memory lets you build persistent knowledge through natural conversations with Large Language Models (LLMs) like Claude, while keeping everything in simple Markdown files on your computer. It uses the Model Context Protocol (MCP) to enable any compatible LLM to read and write to your local knowledge base. |
| [BigQuery](https://github.com/LucasHild/mcp-server-bigquery) | A Model Context Protocol server that provides access to BigQuery. This server enables LLMs to inspect database schemas and execute queries. |
| [ClickUp](https://github.com/TaazKareem/clickup-mcp-server) | A Model Context Protocol (MCP) server for integrating ClickUp tasks with AI applications. This server allows AI agents to interact with ClickUp tasks, spaces, lists, and folders through a standardized protocol. |
| [Discord](https://github.com/SaseQ/discord-mcp) | A Model Context Protocol (MCP) server for the Discord API (JDA), allowing seamless integration of Discord Bot with MCP-compatible applications like Claude Desktop. Enable your AI assistants to seamlessly interact with Discord. Manage channels, send messages, and retrieve server information effortlessly. Enhance your Discord experience with powerful automation capabilities. |
| [Firebase](https://github.com/gannonh/firebase-mcp) | Firebase MCP enables AI assistants to work directly with Firebase services. |
| [Ghost](https://github.com/MFYDev/ghost-mcp) | A Model Context Protocol (MCP) server for interacting with Ghost CMS through LLM interfaces like Claude. This server provides secure and comprehensive access to your Ghost blog, leveraging JWT authentication and a rich set of MCP tools for managing posts, users, members, tiers, offers, and newsletters. |
| [iTerm](https://github.com/ferrislucas/iterm-mcp) | A Model Context Protocol server that provides access to your iTerm session. |
| [Lightdash](https://github.com/syucream/lightdash-mcp-server) | This server provides MCP-compatible access to Lightdash's API, allowing AI assistants to interact with your Lightdash data through a standardized interface. |
| [Monday](https://github.com/sakce/mcp-server-monday) | MCP Server for monday.com, enabling MCP clients to interact with Monday.com boards, items, updates, and documents. |
| [Paperless-NGX](https://github.com/baruchiro/paperless-mcp) | An MCP server for interacting with a Paperless-NGX API server. Manage documents, tags, correspondents, and document types in your Paperless-NGX instance. |


<!-- MCP_SERVERS_END -->
