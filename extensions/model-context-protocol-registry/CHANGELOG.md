# Model Context Protocol Registry Changelog

## [Add MedBillAnalyzer MCP Server] - 2026-10-09

- Add MedBillAnalyzer to the official registry: Check a medical bill against the Explanation of Benefits (EOB) your insurer sent for the same care: the free scan shows how many lines disagree and the dollars in question; a $10 unlock gives each finding, a dispute letter and a phone script. Documents are never stored and cases delete after 30 days. Remote Streamable HTTP server at https://app.medbillanalyzer.com/mcp/apps; no sign-in, no API key.

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
