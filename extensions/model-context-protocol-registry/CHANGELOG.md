# Model Context Protocol Registry Changelog

## [Add Buy-Box MCP Server] - 2026-10-28

- Add Buy-Box to the official registry: save your buying criteria for homes, cars or any other category so your AI agent loads them before it searches, and score listings against them. Hosted Streamable HTTP server at https://buybox.agentconsult.ai/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add EventSend MCP Server] - 2026-10-28

- Add EventSend to the official registry: ask your AI about your product's events, delivery health and usage. Search events, follow one customer's timeline, see why a Slack, Discord, Telegram or webhook notification failed, and check daily stats and quota. Read-only, 9 tools. Hosted Streamable HTTP server at https://eventsend.io/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an `mcp-remote` fallback for other clients.

## [Add Noonlaunch MCP Server] - 2026-10-28

- Add Noonlaunch to the official registry: launch a product on Noonlaunch, search its product directory and weekly winners, and find 333 startup launch directories. Hosted Streamable HTTP server at https://noonlaunch.com/mcp with no sign-in and no API key, a direct HTTP connection in Raycast and an `mcp-remote` fallback for other clients.

## [Add Recued MCP Server] - 2026-10-28

- Add Recued to the official registry: the server you run yourself between AI apps and your mail, calendar, files and CRM records. An app sees only the tools its contract grants, and by default anything that writes or deletes waits for your approval. Local stdio server run with `recued --mcp` on the computer Recued runs on, with a contract key as `RECUED_MCP_TOKEN`.

## [Add Scoopkit MCP Server] - 2026-10-28

- Add Scoopkit to the official registry: AI-industry news as structured, taxonomy-classified events with sources and correction history. Hosted Streamable HTTP server at https://api.scoopkit.dev/mcp with a direct HTTP connection in Raycast and an mcp-remote fallback for other clients; no account or API key needed to start.

## [Add Wine Labs, RentReboot and PennyOCR] - 2026-10-28

- Add Wine Labs and RentReboot with direct hosted HTTP connections and an mcp-remote fallback. Disclose OAuth and service plan requirements.
- Add PennyOCR through mcp-remote with an environment-variable reference for its Bearer header; disclose API-key and processing-credit requirements.

## [Add Crevio MCP Server] - 2026-10-28

- Add Crevio to the official registry: delegate work to an AI agent that runs your small business (products, orders, customers, email, sites), or run scripts against the Crevio API and 3,000+ connected apps. Hosted Streamable HTTP server at https://mcp.crevio.co/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add foto foto MCP Server] - 2026-10-28

- Add foto foto to the official registry: turn your photos or a public iCloud Shared Album into a printed hardcover photo book, and compare photo book prices across services. Hosted Streamable HTTP server at https://fotofoto.app/mcp with no sign-in and no API key, a direct HTTP connection in Raycast and an `mcp-remote` fallback for other clients.

## [Add Shipmail MCP Server] - 2026-10-28

- Add Shipmail to the official registry: business email on your own domain for people and AI agents. Read, search, send and reply in mailboxes, and manage domains, mailboxes, forwarding, inbox rules, calendars, booking pages, newsletters and webhooks. Hosted Streamable HTTP server at https://shipmail.to/api/mcp with a direct HTTP connection in Raycast and an mcp-remote fallback for other clients; OAuth 2.1 sign-in or a Shipmail API key.

## [Add Worthbase MCP Server] - 2026-10-28

- Add Worthbase to the official registry: a household net worth and portfolio tracker. Shares, ETFs, crypto, metals, super and retirement accounts, property, cash and loans, owned by people, trusts or companies, priced daily with exact cost bases, gains, performance, goals and history; ask questions or record a statement, previewed and undoable. Hosted remote Streamable HTTP server at https://worthbase.app/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, Worthbase account (7-day free trial), no API key.

## [Add Visualping MCP Server] - 2026-10-27

- Add Visualping to the official registry: website change monitoring for agents. Create, edit, run, pause and delete monitors, list monitors, read recently detected changes and read full monitor settings. Hosted Streamable HTTP server at https://visualping.io/mcp with OAuth 2.0 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients. Public beta.

## [Add Levea AI Video Editor MCP Server] - 2026-10-27

- Add Levea AI Video Editor to the official registry: prompt-first AI video editor. Describe the edit and get a finished MP4: viral clips from long videos, word-by-word animated captions, 9:16 reframe with face tracking, chroma key and background removal, B-roll, AI voiceover and music, silence removal and multi-platform export, plus projects, assets, brand kits and caption templates. 25 tools. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in in the browser, no API key to paste. Hosted Streamable HTTP server at https://api.livecore.ai/api/v1/misc/mcp with a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Paxa Labs MCP Server] - 2026-10-27

- Add Paxa Labs to the official registry: Thai, English and Mandarin text-to-speech played through your speakers or saved to audio files with captions, voice design from a text description, speech-to-text with subtitles (research preview), translation into Thai, and OCR and field extraction for PDFs and images. Local stdio server run with `npx -y @paxalabs/mcp` and a Paxa API key.

## [Add Just Domain and Just Publish MCP Servers] - 2026-10-27

- Add Just Domain. to the official registry: check a domain name, both prices and whether it can transfer in, then register it on justdomain.ai. Hosted remote Streamable HTTP server at https://mcp.justdomain.ai/ with no sign-in and no API key, a direct HTTP connection in Raycast and an `mcp-remote` fallback for other clients.
- Add Just Publish. to the official registry: publish and update the website you built with AI at a live public URL. Hosted remote Streamable HTTP server at https://mcp.justpublish.ai/ with OAuth sign-in (dynamic client registration), a direct HTTP connection in Raycast and an `mcp-remote` fallback for other clients.

## [Add backlink-guard MCP Server] - 2026-10-27

- Add backlink-guard to the official registry: checks a link source before you submit your site to it and gives an action and a verdict with the evidence, against Google's link spam policies; it also verifies a listing once it is live and audits your own backlinks. Local stdio server `backlink-guard` from PyPI through `uvx --with mcp backlink-guard mcp`; GLASSER_API_KEY (or AISA_API_KEY) and GOANYAPI_API_KEY are optional and add the paid signals.

## [Add NeverApply MCP Server] - 2026-10-27

- Add NeverApply to the official registry: an AI job-search agent to search and match jobs, tailor resumes, answer screening questions, prepare for interviews, and apply with your approval. Official hosted Streamable HTTP server at https://neverapply.co/mcp with OAuth 2.1 sign-in (PKCE and dynamic client registration), plus an `mcp-remote` fallback.

## [Add deed.page MCP Server] - 2026-10-27

- Add deed.page to the official registry: publish static sites from an agent to a permanent public HTTPS URL, then update, list, delete, roll back, attach custom domains and read analytics. Hosted Streamable HTTP server at https://deed.page/mcp with no sign-in and no API key to publish, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Kimiko MCP Server] - 2026-10-27

- Add Kimiko to the official registry: meetings, notes and tasks from Kimiko, the private AI note taker, with tools to search meetings, notes and transcripts, read a meeting's summary, and list, add or update tasks, plus three prompts. Local stdio server that ships inside the Kimiko desktop app at /Applications/Kimiko.app/Contents/MacOS/kimiko-mcp (Mac only), with no arguments, environment variables or API key; it stays off until Allow AI apps is turned on in Kimiko.

## [Add Watchgoose MCP Server] - 2026-10-27

- Add Watchgoose to the official registry: monitor cron jobs and recurring work through a project-scoped Watchgoose connection. Inspect checks and status history with read-only access by default; with explicit read-and-write consent, inspect recent signals and integrations and create, update, pause, resume, or delete checks. Hosted Streamable HTTP server at https://mcp.watchgoose.com/mcp with OAuth 2.1 sign-in (PKCE and dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Refresh MCP Registry Entries] - 2026-10-27

- Connect ElevenLabs through its maintained hosted MCP endpoint with OAuth sign-in.
- Remove the archived E2B and Google Drive listings and the unavailable Shopify Dev listing.

## [Update Local Commander MCP Server] - 2026-10-26

- Update the Local Commander entry's description: it now connects Windows, macOS and Linux computers, many at once, and can take screenshots. The connection is unchanged.

## [Update Terminal Tax MCP Server] - 2026-10-26

- Update Terminal Tax: three tools (was four); nothing to install or connect to file, since an assistant sends JSON-RPC HTTPS POST requests to https://mcp.terminal.tax/v1/hosted-mcp directly; the person reviews and signs on one private filing page; the icon now loads from github.com/terminaltax/terminal-tax-mcp-server.

## [Add Webly MCP Server] - 2026-10-26

- Add Webly to the official registry: website hosting for AI agents. Publish a website or share files and folders at a live URL in seconds, claim it, edit it over MCP, publish drafts you approve, connect custom domains and roll back with version history. Hosted Streamable HTTP server at https://api.webly.ai/v1/mcp with OAuth 2.1 sign-in (dynamic client registration) or a bearer API key, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Rename the GetMattered entry] - 2026-10-26

- Rename the job search entry to GetMattered (id `getmattered`) and move its homepage, icon and remote server to getmattered.com.

## [Update Mnemoverse MCP Server] - 2026-10-26

- Mnemoverse now connects to its hosted Streamable HTTP server at https://mcp.mnemoverse.com/mcp through mcp-remote, with OAuth 2.1 sign-in (dynamic client registration and PKCE) instead of an API key, and the description no longer counts tools.

## [Add 3Dsellers MCP Server] - 2026-10-26

- Add 3Dsellers to the official registry: run eBay, Amazon, Walmart, Etsy, Shopify and TikTok Shop stores from your AI assistant (products, listings, inventory, prices, orders, bulk edits, CSV imports and buyer messages, 150+ tools). Hosted Streamable HTTP server at https://api.3dsellers.com/mcp with OAuth 2.0 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add CodeTrendy MCP Server] - 2026-10-25

- Add CodeTrendy to the official registry: search a curated directory of newly launched startups, SaaS products and AI tools, read full listing profiles, find alternatives to a product and see what is trending. 7 read-only tools. Hosted Streamable HTTP server at https://codetrendy.com/api/mcp with no sign-in and no API key, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add VOMO MCP Server] - 2026-10-25

- Add VOMO through mcp-remote. Search and read saved meeting notes and transcripts with OAuth and read-only access. Requires Node.js with npm.

## [Add CSolar Energia MCP Server] - 2026-10-25

- Add CSolar Energia to the official registry: solar power estimates from the electricity bill or consumption (panels, installed power, generation, estimated price, savings and payback) and the service area check for São Paulo state, Brazil. Read-only, answers in Portuguese. Remote Streamable HTTP server with no sign-in and no API key. Direct HTTP connection in Raycast at https://csolar.com.br/mcp.

## [Add Candor Finance MCP Server] - 2026-10-24

- Add Candor Finance to the official registry: tell your agent what you want with your money, and it sets up goals and a budget from your real US accounts and keeps you on them, with a weekly review that tells the agent what's worth talking through and why. Figures are calculated from the records; read-only toward the accounts, and it never moves money. Hosted Streamable HTTP server at https://api.candor.money/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add TechFabric MCP Server] - 2026-10-24

- Add TechFabric to the official registry: search and read techfabric.com (https://www.techfabric.com), and let TechFabric's engineers write blog posts and case studies for it from their own coding agent, under their byline. Hosted Streamable HTTP server at https://www.techfabric.com/mcp; reading needs no sign-in, writing uses OAuth 2.1 sign-in with a TechFabric Microsoft account. A direct HTTP connection in Raycast and an mcp-remote fallback for other clients. Docs: https://www.techfabric.com/mcp-servers

## [Add MCP Checkup MCP Server] - 2026-10-24

- Add MCP Checkup to the official registry: look up observed status, reports and recent tool-list changes for public MCP servers, fetch the Ed25519-signed attestation behind a report, and request a one-off check of a server by URL. Hosted Streamable HTTP server at https://mcpcheckup.com/mcp with no sign-in, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Shopify Speed Check MCP Server] - 2026-10-24

- Add Shopify Speed Check to the registry: check a Shopify store's PageSpeed score and Core Web Vitals, find slow apps and scripts, and compare Shopify plan fees. Hosted Streamable HTTP server at https://tools.skaidigital.com/mcp with no sign-in, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients

## [Add EvoLink MCP Server] - 2026-10-23

- Add EvoLink to the official registry: image, video, music and speech generation with 150+ models from one EvoLink account. Search models and published prices, get a quote for an exact task, generate after approval, and track tasks and balance. Hosted Streamable HTTP server at https://mcp.evolink.ai/mcp with OAuth 2.1 sign-in (PKCE and dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Revid MCP Servezr] - 2026-10-23

- Add Revid to the official registry: research what goes viral on TikTok, YouTube, Instagram and X, make finished short-form videos with voice, captions, music and AI footage, and publish or schedule them to connected accounts. Hosted Streamable HTTP server at https://www.revid.ai/api/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add datawebot MCP Server] - 2026-10-23

- Add datawebot to the official registry: ecommerce product data for agents. Search products across online shops worldwide, list every seller's price for one product with direct shop links, and run extraction Jobs on Amazon search and product pages (10 countries) and 1,100+ Shopify stores. Hosted Streamable HTTP server at https://mcp.datawebot.com/mcp with OAuth 2.1 sign-in, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add send21 MCP Server] - 2026-10-23

- Add send21 to the official registry: crypto pay links and API for people and AI agents. Create fiat-priced pay links and payment drafts paid to the owner's approved addresses, check payment status and propose receiving addresses for the owner to approve; send21 is non-custodial and the payer signs in their own wallet. Hosted Streamable HTTP server at https://send21.io/mcp, through mcp-remote with a send21 API key as an `Authorization: Bearer` header.

## [Add OverlayQA MCP Server] - 2026-10-23

- Add OverlayQA to the official registry: design QA for coding agents, with WCAG accessibility (axe-core), color-contrast and design-token audits and AI visual reviews on any public URL, plus QA issues, comments, labels and client review links in OverlayQA. Hosted Streamable HTTP server at https://api.overlayqa.com/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Wave AI MCP Server] - 2026-10-22

- Add Wave AI to the official registry: an AI note taker for phone calls, meetings and in-person conversations. Search and quote recordings, ask what a person said with Voice ID, and update action items, folders and sharing. Hosted Streamable HTTP server at https://mcp.wave.co with OAuth 2.0 sign-in (PKCE and dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Multi Calendar MCP Server] - 2026-10-22

- Add Multi Calendar to the official registry: a person's own Outlook.com, Hotmail, Microsoft 365 and Google calendars, many accounts at once with one search for free time across all of them - read, create, move and cancel events, answer invitations and make booking links, booking pages and group polls within the permissions each account's owner sets. Hosted Streamable HTTP server at https://calendar.lumman.co/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Terminal Tax MCP Server] - 2026-10-22

- Add Terminal Tax to the official registry: e-file a 2025 US federal Form 1040 that your AI assistant prepared. The tools check the return and return either the problems to fix or one link to a hosted filing page where you review, sign and pay; Terminal Tax then e-files it. Hosted Streamable HTTP server at https://mcp.terminal.tax/v1/hosted-mcp with no sign-in, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add xTiles MCP Server] - 2026-10-22

- Add xTiles to the official registry: turn AI chats into xTiles projects, notes and tasks, and pull any project back into the chat with its current state. Hosted Streamable HTTP server at https://mcp.xtiles.app/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Databricks Field Guide MCP Server] - 2026-10-22

- Add the Databricks Field Guide to the official registry: search and read TechFabric's Databricks Field Guide (https://databricks.techfabric.com), with runnable SQL, Python and CLI examples and recent Databricks changes, each linked to the docs.databricks.com pages it cites. Hosted Streamable HTTP server at https://databricks.techfabric.com/mcp with no sign-in, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Sync Ausca listing copy in Store page] - 2026-10-22

- Show the corrected Ausca payment boundary in the Store page's server table.

## [Add Spacefast MCP Server] - 2026-10-22

- Add Spacefast to the official registry: publish and host what your AI builds as live Spaces with a built-in database, share links, custom domains and versioned rollbacks. Hosted Streamable HTTP server at https://mcp.spacefast.com with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Runcrate MCP Server] - 2026-10-22

- Add Runcrate to the official registry: GPUs for your AI agent. See live GPU prices, launch and delete GPU instances, run commands and jobs over SSH, move files, manage volumes, SSH keys and secrets, call 200+ open inference models and track spend (37 tools). Hosted Streamable HTTP server at https://mcp.runcrate.ai/mcp with OAuth sign-in in the browser, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Zip-Codes.com MCP Server] - 2026-10-22

- Add Zip-Codes.com to the official registry: US address standardization to ZIP+4, US ZIP Code and Canadian postal code lookup, radius search, distance and census tract demographics. Hosted Streamable HTTP server at https://mcp.zip-codes.com/mcp with no sign-in (demo mode without a key), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add LLMSlim MCP Server] - 2026-10-22

- Add LLMSlim to the community registry: long-term memory for agents with no LLM call (remember, recall, list_memories, forget, fit_context). Messages are stored word for word in a local SQLite file and recalled within a token budget. Local stdio server via `uvx --from llmslim[mcp] llmslim mcp`; no API key.

## [Update Hermoso MCP Server] - 2026-10-21

- Update the Hermoso entry's description: an AI marketing agent and AI ad generator for your AI agent, with no markup on models. The connection is unchanged.

## [Add UnblockingAPI MCP Server] - 2026-10-21

- Add UnblockingAPI to the official registry: fetch public web pages that block simple requests, and get clean Markdown, HTML or template JSON back, with three read-only tools (`unblock_fetch`, `find_templates`, `get_build_guide`). Hosted Streamable HTTP server at https://mcp.unblockingapi.com/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE) or a Bearer API key, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add New-Term Radar MCP Server] - 2026-10-21

- Add New-Term Radar to the official registry: names of new AI models, products and repos from X, Hugging Face, GitHub and sitemaps, and the search terms behind them sized with Google Ads volume and Google Trends. Local stdio server `new-term-radar` from PyPI through `uvx --with mcp new-term-radar mcp`, with an AIsa API key set as `AISA_API_KEY` and absolute `RADAR_CONFIG` and `RADAR_STATE` paths.

## [Add Multi Mail MCP Server] - 2026-10-21

- Add Multi Mail to the official registry: a person's own Gmail, Outlook.com, Microsoft 365, iCloud and Fastmail mailboxes, several at once with one search across all of them - read, draft, send and organise mail within the permissions each mailbox's owner sets. Hosted Streamable HTTP server at https://mail.lumman.co/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Update Datacircle MCP Server] - 2026-10-21

- Update Datacircle's description and homepage.

## [Add NetActuate MCP Server] - 2026-10-20

- Add NetActuate to the official registry: read-only answers from NetActuate's published network data (data center locations and specifications, compliance by site, internet exchanges, the sites nearest a market, products and published pricing), each linked to its netactuate.com page. Hosted Streamable HTTP server at https://netactuate.com/mcp with no sign-in, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Equibles MCP Server] - 2026-10-20

- Add Equibles to the official registry: US stock market data for research, from SEC filing search and XBRL financial statements to earnings call transcripts, insider and congressional trades and 13F holdings. Hosted Streamable HTTP server at https://mcp.equibles.com/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE) or a Bearer API key, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Update Ausca MCP listing] - 2026-10-20

- Use Ausca's final square mark and clarify that the Raycast connection discovers offers while paid calls need an x402-capable client.

## [Add Runx, Sourcey, Frantic and Ausca MCP servers] - 2026-10-19

- Add four first-party hosted MCP servers with current marks and direct HTTP connections in Raycast. Runx and Sourcey expose public read-only discovery, Frantic exposes public bounty reads and governed actions, and Ausca exposes keyless offer discovery with x402 payment required for paid calls. Other MCP clients retain the `mcp-remote` fallback.

## [Add Local Commander MCP Server] - 2026-10-19

- Add Local Commander to the official registry: connect Raycast AI to Windows 11 computers you own to read approved project files and Git state, run the checks and commands you authorize, and check local services. Hosted Streamable HTTP server at https://localcmd.app/mcp with OAuth 2.0 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Wealthnow MCP Server] - 2026-10-19

- Add Wealthnow MCP Server to the registry

## [Add Dynamic Document API MCP Server] - 2026-10-19

- Add Dynamic Document API to the official registry: render PDFs and images from templates, HTML or Markdown, merge PDFs and create validated XRechnung and ZUGFeRD e-invoices. Hosted Streamable HTTP server at https://mcp.dynamicdocumentapi.com/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add ppl MCP Server] - 2026-10-18

- Add ppl to the official registry: a personal CRM for AI agents to look up and update contacts, log interactions, keep notes and set reminders about the people in your life. Hosted Streamable HTTP server at https://withppl.com/mcp with OAuth 2.1 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add AffixIO MCP Server] - 2026-10-17

- Add AffixIO to the official registry: generate and verify zero-knowledge proofs with post-quantum ML-DSA-65 attestations for AI agents, without exposing personal data. Hosted Streamable HTTP server at https://www.affix-io.com/mcp/ with OAuth 2.1 sign-in (dynamic client registration and PKCE), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Posy MCP Server] - 2026-10-17

- Add Posy to the official registry: build and edit a hand-made link-in-bio page, add, update, move and remove link tiles, set the theme and profile, import an existing page and publish. Hosted Streamable HTTP server at https://posy.page/api/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add TopxAI Models MCP Server] - 2026-10-16

- Add TopxAI Models to the official registry: list the TopxAI catalogue's text models with their prices, ask Claude, GPT, Grok, GLM, Kimi or DeepSeek from inside another model's conversation, and ask TypeSafe's Jev typed questions about a piece of text. Hosted Streamable HTTP server at https://ai.topxea.com/mcp/models, connected through `mcp-remote` with a TopxAI API key as a bearer header.

## [Add Kolect Creator Search MCP Server] - 2026-10-15

- Add Kolect Creator Search to the official registry: search 300M+ TikTok, Instagram and YouTube creators from a plain-language brief, look up creators by link or @handle, check fake followers, get public contact emails and save shortlists. Hosted Streamable HTTP server at https://app.kolect.ai/mcp, connected through `mcp-remote` with a Kolect API key as a bearer header.

## [Update Recordist entry] - 2026-10-15

- Correct the Recordist description: it can also control recording, and what it returns goes to the assistant you connect.

## [Add MoltNode by Chord MCP Server] - 2026-10-15

- Add MoltNode by Chord to the official registry: read 31 blockchains over JSON-RPC and get best-route DEX swap quotes with unsigned transactions via Chord, then broadcast a transaction you signed yourself. Non-custodial: it never holds keys or signs. Remote Streamable HTTP server with no sign-in and no API key. Direct HTTP connection in Raycast at https://moltnode.ag/mcp.

## [Add Chord MCP Server] - 2026-10-15

- Add Chord to the official registry: DEX swap quotes and unsigned transactions on 7 EVM chains, plus token boards, candles, wallet PnL and smart money from Chord's index of on-chain trades. Non-custodial: tools return unsigned transactions for your own wallet to sign. Remote Streamable HTTP server with no sign-in and no API key for the data and swap tools. Direct HTTP connection in Raycast at https://api.getchord.xyz/v1/mcp.

## [Add JANCTION Render MCP Server] - 2026-10-15

- Add JANCTION Render to the official registry: render Blender scenes and 3D models (GLB, FBX, USD, OBJ, STL) on cloud GPUs, with a tiled preview first, then product shots, turntables, animations or stills as PNG or MP4. Hosted Streamable HTTP server at https://render.janction.jp/mcp with OAuth 2.1 sign-in (dynamic client registration), a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Add Web3Juice MCP Server] - 2026-10-15

- Add Web3Juice to the official registry: evidence-backed DeFi yield data. Market summaries, pool detail with base vs reward APY, 90-day history and side-by-side comparisons for ~17,000 pools. Read-only. Remote Streamable HTTP server with no sign-in for the research tools. Direct HTTP connection in Raycast at https://web3juice.com/api/mcp.

## [Add Latchkey MCP Server] - 2026-10-14

- Add Latchkey to the official registry: read the CI failures its self-healing GitHub Actions runners could not repair, check run status and logs, dispatch workflows and run one-off commands on fresh ephemeral runners. Hosted Streamable HTTP server at https://latchkey.dev/mcp, connected through `mcp-remote` with a Latchkey API key as a bearer header.

## [Add Taplio MCP Server] - 2026-10-14

- Add Taplio to the official registry: write, schedule and analyze LinkedIn posts, find inspiration, comment, like and connect. Hosted Streamable HTTP server at https://mcp.taplio.com/ with OAuth sign-in, a direct HTTP connection in Raycast and an mcp-remote fallback for other clients.

## [Update AI Applyd MCP Server] - 2026-10-14

- Update AI Applyd's description: it now submits applications on 34 hiring systems, up from 15.

## [Add Nitrosend MCP Server] - 2026-10-14

- Add Nitrosend to the official registry: compose email campaigns and automation flows, manage contacts and segments, send transactional email or SMS, and review delivery. Hosted remote Streamable HTTP server at https://api.nitrosend.com/mcp with direct HTTP connection in Raycast and OAuth sign-in.

## [Add Bool MCP Server] - 2026-10-13

- Add Bool to the official registry: make your own apps and tools from a conversation. Create projects, prompt the builder or edit files, define data, and publish working web apps to a live URL. Hosted remote Streamable HTTP server with OAuth 2.1 sign-in. Direct HTTP connection in Raycast at https://bool.com/api/mcp.

## [Add SolidPing MCP Server] - 2026-10-12

- Add SolidPing to the official registry: open-source uptime and synthetic monitoring. Create, run and diagnose checks, read results and incidents, manage status pages and maintenance windows. Hosted remote Streamable HTTP server with OAuth 2.1 sign-in. Direct HTTP connection in Raycast at https://solidping.io/api/v1/mcp.

## [Update DC Hub MCP Server] - 2026-10-12

- Update DC Hub's description to its current canonical wording.

## [Add Keeploop MCP Server] - 2026-10-12

- Add Keeploop to the official registry: your Mac's Apple Mail and Calendar for Raycast AI. Search mail, read threads, see who is waiting on a reply and check your calendar; writes stay off until you allow them on your Mac. Hosted remote Streamable HTTP server; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key to paste. Needs the Keeploop Mac app with Keeploop Pro or its free trial for remote use; local use is free. Direct HTTP connection in Raycast at https://mcp.keeploop.app/mcp.

## [Add Aggregate MCP Server] - 2026-10-12

- Add Aggregate to the official registry: every company's money in one ledger (cash, burn, runway, receivables, payroll, month-end close) from banks, cards, Stripe, QuickBooks, Xero and payroll. Read-only to banks and Stripe; it can't move money. Hosted remote Streamable HTTP server at https://app.aggregate.finance/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration.

## [Add looot MCP Server] - 2026-10-12

- Add looot to the official registry: one key and one prepaid balance for about 2,500 data API operations (emails, phones, company and people search, SERP, web pages, news). 19 tools. Hosted remote Streamable HTTP server at https://api.looot.ai/mcp with direct HTTP connection in Raycast; OAuth 2.1 sign-in with dynamic client registration, or a Bearer API key.

## [Add Flowra MCP Server] - 2026-10-11

- Add Flowra to the community registry: one MCP server for your apps' tools and your own custom tools, plus hosted AI agents and workflows with approval gates and a run ledger. Hosted remote Streamable HTTP server at https://mcp.flowra.dev/mcp.

## [Add Blawgy MCP Server] - 2026-10-11

- Add Blawgy to the official registry: read Search Console traffic, rankings and indexing, run keyword research, manage the content plan, and write, update and publish SEO articles to WordPress, Shopify, Webflow, Wix, Framer, Ghost or Duda. Hosted remote Streamable HTTP server at https://app.blawgy.com/mcp with direct HTTP connection in Raycast; OAuth 2.1 sign-in with dynamic client registration and PKCE, or an API key. Paid Blawgy plan required.

## [Update LinkMCP MCP Server] - 2026-10-10

- Add a listing tag to LinkMCP's server URL (https://app.linkmcp.io/api/mcp?ref=raycast), so LinkMCP can see which sign-ups come from Raycast. The server works the same way.

## [Update DC Hub MCP Server] - 2026-10-10

- Update DC Hub's description: the server now has 94 tools.

## [Update Datacircle MCP Server] - 2026-10-10

- Update Datacircle's description.

## [Add Korean Law MCP and kordoc MCP Servers] - 2026-10-10

- Add Korean Law MCP to the community registry: Korean statutes, precedents, administrative rules, local ordinances, treaties and legal interpretations from the official 법제처 Open API, plus citation verification for statutes and precedents. Hosted remote Streamable HTTP server at https://mcp.gomdori.app/law; works without a key through a shared, rate-limited key, or with your own free key as `?oc=YOUR_KEY`.
- Add kordoc to the community registry: parse HWP, HWPX, HWPML, PDF, DOCX, XLS/XLSX, PPTX and images into Markdown and structured data, compare documents, fill forms and apply format-preserving HWPX/HWP patches. Local stdio server `kordoc` (MIT) through `npx`; no API key.

## [Add Tapetide MCP Server] - 2026-10-10

- Add Tapetide to the official registry: Indian stock market research for about 8,200 NSE and BSE listed companies (quotes, financials, shareholding, screeners, FII/DII flows, option chains, filings, portfolio and watchlist), 55 tools. Hosted remote Streamable HTTP server at https://mcp.tapetide.com/mcp; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key.

## [Add MedBillAnalyzer MCP Server] - 2026-10-10

- Add MedBillAnalyzer to the official registry: Check a medical bill against the Explanation of Benefits (EOB) your insurer sent for the same care: the free scan shows how many lines disagree and the dollars in question; a $10 unlock gives each finding, a dispute letter and a phone script. Documents are never stored and cases delete after 30 days. Remote Streamable HTTP server at https://app.medbillanalyzer.com/mcp/apps; no sign-in, no API key.

## [Add BankBridge MCP Server] - 2026-10-10

- Add BankBridge to the official registry: read-only access to your own US bank, credit card and investment accounts (balances, transactions, spending summaries, recurring charges, cashflow and holdings), fetched live from your banks on each call. Hosted remote Streamable HTTP server at https://bankbridge.money/api/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key. Paid, $5/mo per connected bank. It can't move money.

## [Add Datacircle MCP Server] - 2026-10-09

- Add Datacircle (https://api.datacircle.dev/mcp, remote, OAuth) to the official registry: Query your favorite B2B data APIs through us. Same request, same price, no markup.

## [Add QRX MCP Server] - 2026-10-09

- Add QRX to the official registry: turn a prompt and a link into a branded, print-ready QR code that is checked to scan, with a hosted qrx.to short link. Hosted remote Streamable HTTP server at https://qrx.codes/mcp through `mcp-remote`; QRX API key sent as an `Authorization: Bearer` header.

## [Add A1 Gallery MCP Server] - 2026-10-09

- Add A1 Gallery to the official registry: hand-curated web design references, inside your agent. Search real websites, sections, pages, fonts and designers, and read design tokens measured off each rendered page. 17 read-only tools. Hosted remote Streamable HTTP server at https://www.a1.gallery/api/mcp; OAuth 2.1 sign-in with dynamic client registration, free A1 account, no API key.

## [Add BulkPublish MCP Server] - 2026-10-09

- Add BulkPublish to the official registry: schedule, cross-post and analyze social media posts across 15 platforms, including Facebook, Instagram, X, TikTok, YouTube, LinkedIn and Bluesky, with media uploads, queue slots, post analytics and, on Pro and Business plans, DM and comment replies. Raycast connects directly to the remote Streamable HTTP server at https://mcp.bulkpublish.com/mcp, with `mcp-remote` as the fallback for other clients; OAuth 2.1 sign-in with dynamic client registration and PKCE, pasting a BulkPublish API key once on the consent screen.

## [Update MAQAMI Travel MCP Server] - 2026-10-09

- Update MAQAMI Travel's description: the server searches hotels and flights and gives the customer a secure checkout link on book.maqami.co, where they pay. It no longer books or takes payment details in a tool call, and the places and weather tools are gone.

## [Add Suparelay MCP Server] - 2026-10-08

- Add Suparelay to the official entries: international calls from your AI assistant, with the price per minute and a Call link to the browser dialer.

## [Update MAQAMI Travel MCP Server] - 2026-10-08

- Update MAQAMI Travel's description: the server searches hotels and flights and gives the customer a secure checkout link on book.maqami.co, where they pay. It no longer books or takes payment details in a tool call, and the places and weather tools are gone.

## [Update Moved Repository Links] - 2026-10-08

- Update the homepage links of the Perplexity, Stripe, Firecrawl, Talk to Figma and Monday entries to the repositories they now redirect to.

## [Add The Bridge MCP Server] - 2026-10-07

- Add The Bridge to the official registry: complete, hosted login, teams, billing and feature flags for your SaaS app, set up by your AI assistant. Remote Streamable HTTP server at https://api.thebridge.dev/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.

## [Add BOIM MCP Server] - 2026-10-07

- Add BOIM (보임) to the official registry: a Korean business directory for AI agents covering 2.7M businesses across all industries, 75,000+ public-procurement vendor cards and open public bids from KONEPS, Defense e-Procurement, LH, K-water and Nuri-jangteo. Read-only. Raycast connects directly to the remote Streamable HTTP server at https://boim.io/api/mcp, with no sign-in and no API key for the free tier (up to 5 results per tool).

## [Update Hermoso MCP Server] - 2026-10-07

- Update the Hermoso entry's description to what the server does today: marketing on autopilot from your AI agent, with ad research, ad and post creation, publishing and scheduling to 10 social channels, autopilot posting, DM automations and campaign management on 12 ad platforms. The connection is unchanged.

## [Add Aitho MCP Server] - 2026-10-07

- Add Aitho to the community registry, for rehearsing and delivering presentations with your own slides. Create a talk from a PDF or PowerPoint deck, attach a speaker script, start a presentation and move between slides, and ask questions answered from your own material. Hosted remote Streamable HTTP server; OAuth sign-in with dynamic client registration and PKCE. Free plan; paid plans for more.

## [Add MiningBridge Intelligence MCP Server] - 2026-10-06

- Add MiningBridge Intelligence to the community registry: critical-mineral and rare-earth trade intelligence (commodity snapshots, trade flows, supplier screening, supply-risk scores, reports). Hosted remote Streamable HTTP server at https://intel.miningbridge.in/api/mcp; OAuth 2.1 sign-in with dynamic client registration and PKCE. Nine read-only tools.

## [Add Search Fragments MCP Server] - 2026-10-06

- Add Search Fragments to the community registry: resolves half-remembered books, films, songs and people into a cited answer, a shortlist or an explicit no, and checks specific factual claims against current web sources. Raycast connects directly to the remote Streamable HTTP server at https://searchfragments.com/api/mcp, with no sign-in and no API key.

## [Add Caly MCP Server] - 2026-10-06

- Add Caly, a remote MCP server from Devino Solutions for scheduling, to the official registry. It is a hosted Streamable HTTP server connected through `mcp-remote`, with OAuth 2.1 sign-in (dynamic client registration and PKCE), no API key.

## [Add DropTheHassle MCP Server] - 2026-10-05

- Add DropTheHassle to the official registry: your AI puts the site it built online on a live HTTPS link, checks domain availability with the registry, and manages your sites (new version or rollback, link rename, domains, share image and favicon, certificate and visitor checks). Hosted remote Streamable HTTP server at https://dropthehassle.com/mcp through `mcp-remote`; publishing and domain checks need no sign-in, managing sites uses OAuth 2.1 sign-in with dynamic client registration.

## [Add LinkMCP MCP Server] - 2026-10-05

- Add LinkMCP to the community registry: use your own LinkedIn account from your AI assistant (profiles and companies, people, job and Sales Navigator search, LinkedIn inbox, posts, comments and reactions, connection requests, your own analytics, work email and mobile finding). Hosted remote Streamable HTTP server at https://app.linkmcp.io/api/mcp; OAuth 2.1 sign-in with dynamic client registration and PKCE. Connecting a LinkedIn account needs a paid plan. Not affiliated with LinkedIn.

## [Add Zihin MCP Server] - 2026-10-05

- Add Zihin to the official registry: build and operate AI agents on the Zihin platform (agents, personas, tools, triggers, budgets, human approvals, run inspection) and chat with them. Local stdio server `@zihin/mcp-server` (MIT) through `npx`; needs a Zihin API key in `ZIHIN_API_KEY`.

## [Add Truthifi MCP Server] - 2026-10-05

- Add Truthifi to the official registry: one verified household record for your AI (accounts, activity, holdings, fees, performance, cash flow and the Truthifi Score with its findings) from 18,000+ institutions. Hosted remote Streamable HTTP server at https://api.truthifi.com/mcp through `mcp-remote`; OAuth sign-in with dynamic client registration, no API key. It can't move money or place trades.

## [Add Chirpie MCP Server] - 2026-10-05

- Add Chirpie to the official registry: the publishing connector for AI agents. Post, thread and schedule to X, Bluesky, LinkedIn, Mastodon and Telegram, with media, drafts, post analytics and comment replies. Hosted remote server at `https://chirpie.ai/mcp` through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste.

## [Add MAQAMI Travel MCP Server] - 2026-10-05

- Add MAQAMI Travel to the official registry: official MCP server for MAQAMI, a hotel and flight booking platform with 3M+ hotels. Search hotels and flights, read hotel details and reviews, look up places and the weather, then prebook and book. Booking creates a real reservation. Raycast connects directly to the remote Streamable HTTP server at https://mcp.maqami.co/, with no sign-in and no API key.

## [Add handoff MCP Server] - 2026-10-05

- Add handoff to the official registry: coordination for autonomous agent swarms. Agents discover funded projects, form teams, plan goals and tasks, message end-to-end encrypted, and get paid when the requester verifies the work. Remote Streamable HTTP server at https://handoff.lol/mcp through `mcp-remote`; no API key.

## [Add VoiceMoat MCP Server] - 2026-10-05

- Add VoiceMoat to the official registry: the personal brand OS for Twitter/X and LinkedIn. Score a draft against your voice profile, improve it, get hooks and post ideas, read your analytics, and publish or schedule posts after a preview. Hosted remote Streamable HTTP server at https://app.voicemoat.com/api/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key. Requires a paid VoiceMoat Pro or Enterprise plan.

## [Add Clipwright MCP Server] - 2026-10-04

- Add Clipwright to the official registry: UGC-style video ads without filming. Tell your assistant what the video should say and get a vertical clip of a realistic actor saying it, or a faceless video from a script or a short brief, with the price shown before anything renders. Local stdio server through `npx -y -p @clipwright/mcp-server clipwright-mcp`; needs a Clipwright API key in `CLIPWRIGHT_API_KEY`.

## [Add Desearch MCP Server] - 2026-10-03

- Add Desearch to the official registry: AI search, X search and web search for AI agents, plus page extraction and X data tools. Local stdio server `desearch-mcp-server` (MIT) through `npx` with 15 tools; bring your own Desearch API key from console.desearch.ai/api-keys, set as `DESEARCH_API_KEY`.

## [Add DC Hub MCP Server] - 2026-10-03

- Add DC Hub to the official registry: live data on the physical infrastructure behind AI, with facility coverage in 170+ countries, 300+ markets scored daily, 1,700+ tracked M&A deals, live grid, fiber, gas and interconnection-queue data, and Capacity Source for finding available data-center capacity (exact fits, multi-provider bundles, brokered intros). 92 tools, with a source on every answer. Hosted remote Streamable HTTP server at https://dchub.cloud/mcp through `mcp-remote`; free tier works with no API key and no sign-in.

## [Add Weio site check MCP Server] - 2026-10-03

- Add Weio site check to the official registry: read-only website facts for AI agents. Check whether a domain and its www version load securely or show a browser privacy warning and why, with the certificate expiry date; read what a homepage publishes (title and description, language, CMS or site builder, mobile viewport tag, role contact emails, phone numbers, social links, contact page); and list businesses from a small dated scan index. Raycast connects directly to the remote Streamable HTTP server at https://weio.ai/mcp, with no sign-in; 10 free calls a day without a key, more with a paid Weio API key.

## [Add Edgepedia MCP Server] - 2026-10-03

- Add Edgepedia to the official registry: search and read Edgepedia, EdgeChat's free encyclopedia of over 300,000 articles with citations. Raycast connects directly to the remote Streamable HTTP server at https://www.edgechat.ai/mcp, with no sign-in and no API key.

## [Add Parlor.sh MCP Server] - 2026-10-03

- Add Parlor.sh to the official registry: rooms where AI agents of any vendor talk to each other. A room is a URL; Raycast connects directly to the remote Streamable HTTP server at https://parlor.sh/mcp, with no sign-in and no API key.

## [Add Symbioza MCP Server] - 2026-10-02

- Add Symbioza to the official registry: Run a GPU job under a hard dollar cap and collect the files it writes. Hosted remote Streamable HTTP server through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key to paste. Estimates are free; running GPU jobs requires prepaid credit added on the Symbioza website.

## [Add Devino MCP Servers] - 2026-10-01

- Add 13 remote MCP servers from Devino Solutions to the official registry: BioFlow, DoDomain, GetItDone, Notifly, Postify, Sendly, Shorty, SnapVisor, SuperBooks, uNotes, upAPI, Uptimely, VoiceLabs. Each is a hosted Streamable HTTP server connected through `mcp-remote`, with OAuth 2.1 sign-in (dynamic client registration and PKCE), no API key.

## [Fix Linear Installation and Clarify Runtime Setup] - 2026-10-01

- Connect Linear directly in Raycast without requiring Node.js or the npm proxy, and update its endpoint for other clients.
- Show the proxy command and Node.js requirement for other clients alongside Linear's direct Raycast setup.
- Show Node.js and uv setup requirements in server details and document how to resolve missing executable errors.

## [Add Trvlrr MCP Server] - 2026-10-01

- Add Trvlrr to the official registry: a travel journal and trip planner — trips taken and planned with their flights, stays, activities and expenses, lifetime travel stats and, with Trvlrr Plus, photo search; ask about a trip, add a booking or import a trip from anywhere. Hosted remote Streamable HTTP server at https://trvlrr.app/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, free Trvlrr account, no API key.

## [Add 60fps MCP Server] - 2026-09-30

- Add 60fps to the official registry: real iOS interactions from shipping apps, with the motion breakdown and SwiftUI to build them. Search 2,000+ interactions in plain language, read the motion anatomy behind each one and get starter SwiftUI tuned to the real timing. Read-only. Hosted remote Streamable HTTP server at https://mcp.60fps.design/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and a paid 60fps MCP licence, no API key.

## [Add Better Design MCP Server] - 2026-09-30

- Add Better Design to the official registry: design systems, UI and UX principles, icons and UI review for AI coding agents. Find or create a design system that fits your product, install its components, and review finished screens for hard-to-read text, hard-to-find buttons and unclear copy. Hosted remote Streamable HTTP server at https://better-design.com/api/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, free Better Design account, no API key.

## [Add GitDiagram MCP Server] - 2026-09-30

- Add GitDiagram to the official registry: architecture diagrams of public GitHub repositories, with a written explanation of how a codebase is organized, its main components with their source paths, how they connect, and Mermaid source, plus a search of GitDiagram's existing diagrams and explainer-video transcripts. Read-only remote Streamable HTTP server at https://gitdiagram.com/mcp through `mcp-remote`; no sign-in, no API key.

## [Add Opus Growth MCP Server] - 2026-09-30

- Add Opus Growth to the community registry: manage advertising from chat across Google, Meta, Microsoft, TikTok and LinkedIn (campaigns, ad groups, creatives, audiences, bidding, keywords and extensions), plus reporting and SEO with Search Console, GA4, GTM, Google Business Profile and YouTube. Hosted remote Streamable HTTP server at https://mcp.opus-growth.com/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key.

## [Add Recordist] - 2026-09-30

- Add Recordist community entry (`@recordist/gateway`): search and read the meetings recorded on your own computer.

## [Add AudioPod AI MCP Server] - 2026-09-30

- Add AudioPod AI to the official registry: text-to-speech in 200+ languages, voice cloning and conversion, music generation, stem and speaker separation, transcription with word-level timestamps, noise removal and media conversion. Remote Streamable HTTP server at https://mcp.audiopod.ai through `mcp-remote`, authenticated with an AudioPod API key.

## [Add apMZoomAI Dongdaemun Wholesale MCP Server] - 2026-09-27

- Add apMZoomAI · Dongdaemun Wholesale to the official registry: search wholesale fashion items listed by stalls in the Dongdaemun market in Seoul, see new arrivals, and find stalls by building, floor and stall number, with links to each item or stall on apMZoomAI, in eight languages. Read-only; no prices or merchant contact details. Hosted remote Streamable HTTP server at https://www.apmzoom.com/mcp through `mcp-remote`; no sign-in, no API key.

## [Add ZoneFoundry for Sonos MCP Server] - 2026-09-27

- Add ZoneFoundry for Sonos to the official registry: control your Sonos speakers (play music, volume, grouping, moving playback between rooms, switching to TV, spoken announcements and reminders) through the official Sonos cloud, with no home bridge. Hosted remote Streamable HTTP server at https://relay.zonefoundry.dev/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.

## [Add Mnemoverse MCP Server] - 2026-09-26

- Add Mnemoverse to the official registry: hosted persistent memory for AI agents over MCP. Tell it a recalled memory helped or misled, and it re-ranks what comes back next; shared rooms for multi-agent work. Local stdio server `@mnemoverse/mcp-memory-server` (MIT) through `npx`; it lists its ten tools without a key, and every tool call needs a free API key from console.mnemoverse.com.

## [Add Award Travel Finder, Airport Lounge List, FlightQueue and FlightSeatMap MCP Servers] - 2026-09-26

- Add Award Travel Finder to the official registry: search award flight availability across 28 airlines and award-chart pricing for 23 loyalty programs. Hosted remote Streamable HTTP server at https://mcp.awardtravelfinder.com/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.
- Add Airport Lounge List to the official registry: search 8,500+ airport lounges and check access by card, membership or status. Hosted remote Streamable HTTP server at https://mcp.airportloungelist.com/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.
- Add FlightQueue to the official registry: airport security wait times, FAA delays, EES border queues and baggage stats. Hosted remote Streamable HTTP server at https://mcp.flightqueue.com/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.
- Add FlightSeatMap to the official registry: seat maps, seat ratings, traveller reviews and seat alerts for 117 airlines. Hosted remote Streamable HTTP server at https://mcp.flightseatmap.com/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.

## [Add Quibbly MCP Server] - 2026-09-26

- Add Quibbly to the official registry: search synced LinkedIn conversations and connections, see who watched your videos, manage follow-ups, notes and tags, and draft replies that you send yourself. Hosted remote Streamable HTTP server at https://server.quibbly.co/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key.

## [Add QuoteBill MCP Server] - 2026-09-26

- Add QuoteBill to the official registry: draft quotations and invoices from 133 templates, look up the published tax rate for 195 countries with the official source, total line items and get a link that opens the finished document on quotebill.com (Excel, Word or PDF). Read-only tools. Hosted remote Streamable HTTP server at https://quotebill.com/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, free QuoteBill account, no API key.

## [Add SpringBrand MCP Server] - 2026-09-25

- Add SpringBrand to the official registry: social listening across X, TikTok, Instagram, YouTube, Reddit and Xiaohongshu; website traffic, traffic-source and SEO research; company, contact and creator discovery; and copy, image, video and voiceover generation, all behind one connector and billed per call. Hosted remote Streamable HTTP server at https://connector.springbrand.ai/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration and PKCE, no API key.

## [Add Scout7 MCP Server] - 2026-09-25

- Add Scout7 to the official registry: plans a week of organic marketing from your brand, writes SEO blogs, videos, LinkedIn carousels and social posts, schedules them across your channels and reports what moved, with your approval before anything goes live. Hosted remote Streamable HTTP server at https://mcp.scout7.ai/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.

## [Add Engine DJ, Serato DJ and Bandcamp MCP Servers] - 2026-09-24

- Add Engine DJ, Serato DJ and Bandcamp to the community registry: ask an AI assistant about your Engine DJ (Denon) or Serato DJ library (harmonic BPM and Camelot key search, duplicate and missing-file audits, playlists and crates built on request) or dig Bandcamp without an account. Open-source local stdio servers started with `npx`; not affiliated with inMusic, Serato or Bandcamp.

## [Add AI Applyd MCP Server] - 2026-09-24

- Add AI Applyd to the official registry: search jobs matched to your resume, tailor the resume and cover letter to a posting, and submit the application on the employer's own hiring system across 15 ATS platforms; score a resume against a job and get interview prep. Hosted remote Streamable HTTP server at https://mcp.aiapplyd.com/mcp through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key.

## [Add Clera MCP Server] - 2026-09-24

- Add Clera to the official registry: search 210,000+ vetted startup candidates who opted in to hearing about roles, review the people Clera already picked for your open roles and request intros; candidates search open startup jobs, read full listings and save the good ones. Hosted remote Streamable HTTP server at https://mcp.getclera.com through `mcp-remote`; OAuth 2.1 sign-in with dynamic client registration, no API key; free during the beta.

## [Add RemoveDuplicates.org MCP Server] - 2026-09-24

- Add RemoveDuplicates.org to the official registry: remove duplicate lines or CSV/TSV rows and get the cleaned text back with counts. Remote Streamable HTTP server at https://removeduplicates.org/mcp through `mcp-remote`; no sign-in, no API key.

## [Add Codex Reset MCP Server] - 2026-09-24

- Add Codex Reset to the official registry: OpenAI Codex usage-limit reset forecast for the next 24 and 48 hours, the verified reset record with source links, and Codex service status. Read-only remote Streamable HTTP server at https://codex-reset.com/mcp through `mcp-remote`; no sign-in, no API key.

## [Add QuillHub MCP Server] - 2026-09-23

- Add QuillHub to the official registry: search meeting transcripts, read who said what, decisions and action items, quotes from one person across meetings, and new transcriptions from files or links. Remote Streamable HTTP server at https://mcp.quillhub.ai/mcp through `mcp-remote`; OAuth 2.1 sign-in, no API key.

## [Add SocialFaktory MCP Server] - 2026-09-22

- Add SocialFaktory to the official registry: write, generate, schedule and publish a brand's social content, in its own voice, on every channel. Remote Streamable HTTP server at https://www.socialfaktory.com/mcp through `mcp-remote`; OAuth 2.1 sign-in, no API key.

## [Add BlindPay MCP Server] - 2026-09-22

- Add BlindPay to the official registry: stablecoin global payments (receivers, virtual accounts, FX quotes, payouts, payins, balances, history). Remote Streamable HTTP server at https://mcp.blindpay.com/mcp through `mcp-remote`; OAuth 2.1 sign-in, no API key.

## [Add GTD Brain MCP Server] - 2026-09-21

- Add GTD Brain to the official registry: a Getting Things Done board (capture to Inbox, next actions by context, projects, waiting-for, weekly review) shared with the GTD Brain web, iOS and Android apps. Remote Streamable HTTP server at https://mcp.gtdbrain.com/api/gtdbrain/v1/mcp through `mcp-remote`; OAuth 2.1 sign-in with an email code, no API key.

## [Add Sitelemetry MCP Server] - 2026-09-19

- Add Sitelemetry to the official registry: authorized website audits (security posture, technical SEO, AI visibility, analytics integrations, WCAG 2.2 accessibility and performance) with evidence-backed findings and fixes in nine languages. Remote Streamable HTTP server at https://sitelemetry.com/mcp through `mcp-remote`; OAuth 2.1 sign-in, no API key.

## [Add Quantral MCP Server] - 2026-09-19

- Add Quantral to the official registry: per-company stock sentiment scores (0-100), top signals, monthly recaps and the mentions behind each score from the sources Quantral tracks. Hosted remote Streamable HTTP server at https://app.quantral.com/api/mcp through `mcp-remote`; OAuth 2.1 sign-in, Quantral subscription required.

## [Add EmpirioLabs AI MCP Server] - 2026-09-14

- Add EmpirioLabs AI to the community registry: 180+ AI models, media generation, web search and research, batch jobs, GPU Cloud and hosted agents as tools. Remote Streamable HTTP server at https://mcp.empiriolabs.ai/mcp through `mcp-remote`; OAuth 2.1 sign-in or an EmpirioLabs API key.

## [Add Pixelesq MCP Server] - 2026-09-12

- Add Pixelesq to the official registry: build and manage a Pixelesq website (pages, sections, content, SEO and analytics) with every edit saved as a draft until you publish. Remote Streamable HTTP server at https://mcp.pixelesq.app/mcp through `mcp-remote`; OAuth 2.1 sign-in, no API key.

## [Add Vibe Prospecting MCP Server] - 2026-09-12

- Add Vibe Prospecting to the community registry for B2B company and contact intelligence in prospecting workflows. Connects to the remote OAuth MCP server through `mcp-remote`.

## [Add Metabrain, AgentMailKit and Site Spec MCP Servers] - 2026-09-11

Add three community servers. Metabrain gives coding agents persistent memory in a local SQLite file (learn, recall, verdict, hypotheses, start_brief, stats, capture_error). AgentMailKit runs email sends as named jobs with a preview step and dry_run defaulting to true (list_jobs, run_job, preview_job, list_plugins). Site Spec audits and repairs a website across 40 SEO, accessibility, privacy, structured data and AI searchability checks (audit_site, fix_issue, compile_spec, list_checks). All three are local stdio servers that need no API key.

## [Add Neither MCP Server] - 2026-09-11

Add Neither to the community registry: project context your AI can query through MCP (selected notes/documents in Cursor or Claude Desktop, related context, source evidence). Local stdio via `npx -y @neitherai/mcp-server@latest`; requires `NEITHER_API_KEY`.

## [Add Contracko MCP Server] - 2026-09-11

Add Contracko to the community registry for contract review, document search, and renewal tracking. Connects to the remote OAuth MCP server through `mcp-remote`.

## [Add Kyma API MCP Server] - 2026-09-10

Add Kyma API to the community registry: hosted MCP server for one endpoint across open and frontier models, with measured per-model uptime, public usage rankings, and a spend-capped chat tool. OAuth 2.1 sign-in via the `@kyma-api/mcp-server` stdio bridge.

## [Add Hermoso MCP Server] - 2026-09-08

Add Hermoso to the official registry: an AI ad studio for marketers. Research winning ads across the Meta, Google and LinkedIn ad libraries and organic social, generate finished on-brand image and video ads, publish and schedule to your own channels, and build and manage paid campaigns across the major ad platforms. Remote Streamable HTTP server with OAuth sign-in through an `mcp-remote` bridge, no API key.

## [Add Stellary MCP Server] - 2026-09-02

Add Stellary to the community registry: AI-native project piloting and project management (open beta). Remote Streamable HTTP MCP server via mcp-remote; Bearer PAT required.

## [Refresh plori MCP Server] - 2026-08-24

Refresh plori's description for its current persistent-environment positioning and support for runs, human input, scheduling, connections, and workflows.

## [Add smart-me MCP Server] - 2026-08-23

Add smart-me to the official registry, giving AI assistants access to the smart-me energy platform: live meter readings, quarter-hourly load profiles and daily series, EV charging stations with their sessions and load-management groups, and the tariffs, invoice positions and ZEV (tenant) billing of a property. The remote Streamable HTTP server uses smart-me OAuth sign-in through an `mcp-remote` bridge.

## [Add One MCP Server] - 2026-08-21

Add One to the official registry, connecting AI assistants to 700+ apps through four tools: list connected accounts, search a platform's actions, read an action's real API documentation, and execute it. The remote Streamable HTTP server uses One OAuth sign-in through an `mcp-remote` bridge.

## [Add PostEverywhere MCP Server] - 2026-08-20

- Added PostEverywhere (social media publishing to 11 platforms) to the official registry entries

## [Add Tripsy MCP Server] - 2026-08-19

Add Tripsy to the official registry, enabling AI assistants to create trips and manage flights, stays, activities, expenses, and itinerary details. The remote Streamable HTTP server uses Tripsy OAuth sign-in through an `mcp-remote` bridge.

## [Add Structured MCP Server] - 2026-08-06

Add Structured to the official registry, allowing AI assistants to view schedules and inbox tasks and create, update, complete, delete, and manage recurring tasks. The remote Streamable HTTP server uses Structured Cloud OAuth sign-in through an `mcp-remote` bridge with a dedicated public client and email-only scope.

## [Add Tendem MCP Server] - 2026-08-06

Add Tendem to the official registry: delegate tasks to vetted human experts (research, competitive analysis, fact-checking, copywriting, editing, design review, presentation polish, data cleaning and list building). Tendem's orchestrator scopes the task and quotes a transparent price, and the expert's verified results come back as markdown plus files. Remote Streamable HTTP MCP server via mcp-remote with OAuth 2.0 sign-in; an API key alternative is available for headless use.

## [Add JobYap MCP Server] - 2026-08-03

Add JobYap to the official registry: search job postings aggregated from companies' official careers sites — salaries, locations, and a community discussion thread on every job. Remote Streamable HTTP MCP server via mcp-remote; no auth required.

## [Add Webhound MCP Server] - 2026-07-29

Add Webhound to the official registry for private, budgeted reports and datasets. The remote Streamable HTTP MCP server uses OAuth so each connection authenticates to that user's own Webhound account.

## [Update UseMyContext description] - 2026-07-28

Remove the hard-coded tool count from the UseMyContext description. The server's tool surface has grown since the original submission (now 13 tools), and a number in the listing goes stale with every addition - the description now names the capabilities without a count.

## [Add UseMyContext MCP Server] - 2026-07-28

Add UseMyContext to the official registry: the personal context layer for AI - one user-owned profile plus files, read by any MCP client so you never re-introduce yourself. 8 tools (profile, file search and reads, cited answers from documents, exact table queries, suggested updates, shared contexts). Remote Streamable HTTP endpoint via mcp-remote with OAuth 2.1 sign-in; free tier, no API key.

## [Add Trends MCP] - 2026-07-26

Add Trends MCP to the official registry: live cross-platform trend data for AI agents across Google, YouTube, TikTok, Reddit, Amazon, Wikipedia, news, npm, Steam, and more. Remote endpoint via mcp-remote; Bearer API key required (free tier at trendsmcp.ai).

## [Add Glif] - 2026-07-23

Add Glif to the official registry: media-generation agent (images, video, audio, transcription, multi-step workflows). Hosted remote streamable HTTP MCP server with OAuth sign-in via mcp-remote; no API key required.

## [Add Agentcard MCP Server] - 2026-07-15

Add Agentcard to the official registry: prepaid virtual cards for AI agents. Fund a wallet, set spend caps and human approvals, and your agent mints a one-time virtual card for each purchase that works at any merchant. Remote streamable HTTP MCP server with OAuth 2.0 sign-in via mcp-remote; no API key required.

## [Add Appwrite MCP Server] - 2026-07-13

Add the official Appwrite MCP server to the registry, enabling AI assistants to securely inspect and manage Appwrite projects and resources through Appwrite's API using OAuth authentication.

## [Add Nika MCP Server] - 2026-07-12

Add Nika to the community registry — a workflow language for AI (one file, four verbs, one Rust binary). Its MCP server is a read-only oracle: agents validate .nika.yaml workflows (nika_check, nika_explain) and learn the language (schema, templates, examples, catalogs) without executing anything; execution stays on the CLI, budget-capped and trace-verified. Local binary via Homebrew/cargo-binstall/Nix; no env vars, no API key.

## [Update Circleback MCP Server URL] - 2026-07-10

Update the Circleback MCP server endpoint from app.circleback.ai to circleback.ai to reflect our domain migration.

## [Add plori MCP Server] - 2026-07-06

Add official plori MCP server to registry: give your AI agent its own cloud computer. Create and drive hosted plori agents (persistent disk, real tools, memory that survives between sessions), read their replies, answer human-in-the-loop questions, and schedule deferred runs. Remote endpoint via mcp-remote; OAuth sign-in or API key.

## [Add memo MCP Server] - 2026-07-06

Add memo to the community registry — local-first persistent memory for AI agents: MLX embeddings on Apple Silicon (CPU fallback elsewhere), sqlite-vec + BM25 hybrid search, markdown-on-disk storage compatible with Obsidian. No cloud APIs.

## [Add Jellypod MCP Server] - 2026-06-19

Add official Jellypod MCP Server to registry for creating, editing, and publishing conversational AI podcasts (podcasts, hosts, sources, episodes, and analytics). Remote endpoint via mcp-remote.

## [Add Olostep MCP Server] - 2026-06-16

Add official Olostep MCP Server to registry for web data access — search, scrape, crawl, batch processing, and cited AI answers.

## [Add OptionsAhoy MCP Server] - 2026-06-16

Add community OptionsAhoy MCP Server to registry for equity-compensation tax optimization (ISO/AMT scheduling, NSO, RSU sell-vs-hold, QSBS eligibility, concentration risk, protective puts/collars) across federal plus 50-state and DC tax code. Remote endpoint via mcp-remote, no API key required.

## [Add VC Deal Flow Signal MCP Server] - 2026-06-03

Add community VC Deal Flow Signal MCP Server to registry for GitHub-derived engineering acceleration signals across ~400 venture-backed startups in 20 sectors (read-only, no API key).

## [Add Alai MCP Server] - 2026-04-30

Add community Alai MCP Server to registry for AI-powered presentation generation (text-to-slides, exports to PDF, PPTX, or shareable link).

## [Add Sanity MCP Server] - 2026-03-07

Add official Sanity MCP Server to registry for direct access to Sanity projects.

## [Add RouteMesh MCP Server] - 2026-03-05

Add official RouteMesh MCP Server to registry for multi-chain EVM RPC access with RouteMesh routing and failover.

## [Add Razuna MCP Server] - 2026-02-03

Add official Razuna MCP Server to registry.

## [Update Anytype MCP Server] - 2026-01-13

Update Anytype MCP Server to use the latest version of the Anytype API.

## [Add Circleback MCP Server] - 2026-01-13

Add official Circleback MCP Server to registry.

## [Add Atono MCP Server] - 2025-12-08

Add official Atono MCP Server to registry to manage projects

## [Update Nuxt MCP Server URL] - 2025-11-17

## [Update Nuxt UI MCP Server URL] - 2025-09-23

## [Add Nuxt UI MCP Server] - 2025-09-10

Add official Nuxt UI MCP Server to registry

## [Add Rube MCP Server] - 2025-08-26

Add official Rube MCP Server to registry to connect AI tools to 500+ apps

## [Add Linear MCP Server] - 2025-08-11

Add official Linear MCP Server to registry to manage projects

## [Updated Apify] - 2025-08-04

Updated Apify MCP server configuration from `APIFY_API_TOKEN` to `APIFY_TOKEN`

## [Update Google Drive Homepage URL] - 2025-07-23

Update Google Drive Homepage URL to the correct one.

## [Add Gen-PDF MCP Server] - 2025-06-19

Add Gen-PDF MCP server to let AI generate beautiful PDF documents.

## [Add Keboola MCP Server] - 2025-06-17

Add official Keboola MCP Server to registry - an open-source bridge between your Keboola project and modern AI tools. It turns Keboola features—like storage access, SQL transformations, and job triggers—into callable tools for Claude, Cursor, CrewAI, LangChain, Amazon Q, and more.

## [Updated Prisma MCP Server URL] - 2025-06-05

The Prisma MCP server URL was updated.

## [Add Kagi Search MCP Server] - 2025-06-05

Add official Kagi Search MCP Server to registry.

## [Add Anytype MCP Server] - 2025-05-30

Add official Anytype MCP Server to registry.

## [Add Thena MCP Server] - 2025-05-28

Add official Thena.ai MCP Server to registry, this allows users and AI agents to interact with Thena's services and manage customer requests coming from Slack, Email, Discord and more.

## [Add Grafana MCP Server] - 2025-05-26

Add the official Grafana MCP server to the Model Context Protocol Registry. Grafana MCP server provides seamless integration with Grafana APIs, enabling monitoring, visualization, and observability capabilities for developers and tools.

## [Add Paperless MCP Server] - 2025-05-21

Add Community Paperless MCP Server to registry, this allows to manage documents in Paperless.

## [Add Shopify Dev Server] - 2025-05-21

Add Official Shopify Dev MCP Server to registry.

## [Add Prisma MCP Server] - 2025-05-21

Add Official Prisma MCP Server to registry.

## [Add Zeabur MCP Server] - 2025-05-21

Add Official Zeabur MCP Server to registry, this allows to manage and deploy Zeabur projects.

## [Add Apify MCP Server] - 2025-05-16

Add the official Apify MCP server to the Model Context Protocol Registry. Apify MCP server allows AI agents to use 5,000+ ready-made Actors for use cases such as extracting data from websites, social media, search engines, online maps, and more.

## [Add Nuxt MCP Server] - 2025-05-15

Add Official Nuxt MCP Server to registry, this allow docs and modules search.

## [Chore: Fixed broken MCP links] - 2025-05-09

## [Initial Version] - 2025-05-09

Initial version of the Model Context Protocol Registry. It contains two built-in registries. One with official servers and the other with community servers. Additionally, it contains a Smithery registry. The registry makes it easy to find and install MCP servers in Raycast and other apps that support the Model Context Protocol.
