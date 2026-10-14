# Linten for Raycast

**Make your product effortlessly discoverable, readable, and indexable by AI agents and crawlers.**

Audit `llms.txt` Spec v2 syntax, probe 100-link reachability, calculate token budgets, and compile companion archives directly from your keyboard.

Engineered by [Loopstates](https://loopstates.com).

---

## Why Linten?

When AI agents like **ChatGPT**, **Claude**, **Perplexity**, or **Cursor** visit your website, heavy JavaScript SPAs, cluttered navigation bars, and cookie banners make it difficult for them to read your documentation accurately. This leads to hallucinations, outdated API answers, and poor discovery.

The `llms.txt` standard solves this by providing a clean, curated Markdown manifest designed specifically for LLMs. **Linten gives you a complete toolkit in Raycast to build, test, and maintain this standard in seconds.**

---

## What You Can Do

### 1. Stop AI Crawlers From Hallucinating About Your API

- **Instant Spec v2 Audits**: Check your live `llms.txt` file or paste draft markdown to ensure your headers, blockquotes, and sections conform to the official specification.
- **100-Link Health Probe**: Automatically verifies that every link in your documentation returns a valid `200 OK` response with sub-second latency—so AI models never follow broken 404 links.
- **Actionable Quality Score**: Get a clear 0–100 rating with diagnostic recommendations to improve your documentation's discovery readiness.

### 2. Compile Instant Context Bundles for Claude & Cursor

- **One-Click `llms-full.txt` Compilation**: Crawl every documentation link in your manifest and strip away boilerplate navigation and HTML chrome.
- **Direct to Clipboard**: Instantly paste clean full-text archives into **Claude Projects**, **ChatGPT Custom GPTs**, or **Cursor** for accurate, codebase-aware answers.
- **Frontier Token Budgeting**: Real-time context window fit gauges for **Gemini 2.0 (1M)**, **Claude 3.5 Sonnet (200k)**, **GPT-4o (128k)**, and **DeepSeek-V3 (64k)**.

### 3. Never Start from Scratch: 27 Industry Starter Templates

- **Ready-Made Manifests**: Choose from 27 production-tested industry templates—including **SaaS Platforms**, **Developer APIs**, **Healthcare**, **Fintech**, **Cybersecurity**, **E-Commerce**, and **Legal**.
- **Personalized for Your Brand**: Simply type your domain (e.g. `yourcompany.com`) and Linten automatically personalizes all headings, links, and structure.
- **Cloud-Connected**: Any new template published to Linten Cloud is automatically available in your Raycast launcher without updating the extension.

### 4. Prove Your Compliance on GitHub

- **Live Shields Badges**: Generate dynamic Spec v2 compliance badges for your repository `README.md`.
- **Multi-Format Export**: Copy as Markdown (`[![llms.txt](...)]`), HTML embed, or raw SVG image URL with a single keystroke.

---

## Commands & Shortcuts

| Command                       | Shortcut | What It Does                                                                                                              |
| :---------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------ |
| **Audit Llms.txt**            |  `⌘ ↵`   | Audit any URL or clipboard markdown; press `⌘↵` to compile companion archive or `⌘F` to auto-format.                      |
| **Compile Llms-Full.txt**     |   `↵`    | Synthesize and bundle all linked documentation into a single full-text context archive copied directly to your clipboard. |
| **Generate Starter Template** |   `↵`    | Browse 27 industry templates, personalize for your domain, and preview live Markdown before copying.                      |
| **Copy Spec V2 Badge**        |   `↵`    | Generate real-time compliance shields badge code (`⌘H` for HTML, `⌘U` for URL).                                           |

---

## Frontier Context Window Reference

Linten monitors your token load against leading frontier AI models:

| AI Model                          | Maximum Context Window | Best Use Case                                                |
| :-------------------------------- | :--------------------: | :----------------------------------------------------------- |
| **Google Gemini 2.0 Flash / Pro** |   1,000,000+ tokens    | Entire documentation archives, full library API references   |
| **Anthropic Claude 3.5 Sonnet**   |     200,000 tokens     | Deep technical guides, architecture specifications, API docs |
| **OpenAI GPT-4o**                 |     128,000 tokens     | Core endpoints, getting started tutorials, feature guides    |
| **DeepSeek-V3 / R1**              |     64,000 tokens      | Concise quickstarts, executive platform overviews            |

---

## Frequently Asked Questions

#### What is llms.txt?

`llms.txt` is an open standard proposed to give LLMs and AI crawlers clean, structured markdown documentation without the visual noise, tracking scripts, and HTML wrappers of traditional web pages.

#### Why does Linten probe links?

When an AI crawler ingests your `llms.txt`, it relies on the declared URLs to fetch deeper context. Broken links (404s) or slow redirects degrade crawler performance and cause incomplete answers. Linten ensures every link is reachable before crawlers index your site.

#### Can I test files hosted on my local machine?

To protect internal networks, Linten does not send requests to private addresses like `localhost`, `127.0.0.1`, or `169.254.x.x`. To test local files, simply copy your markdown text and paste it into Linten—it will perform full AST linting directly from your clipboard.

#### Does Linten store my audited files?

No. All validation and companion synthesis requests are processed transiently in memory over HTTPS and are never stored or used for AI training.

---

## Privacy Notice

Linten communicates with Linten Cloud (`https://linten.apps.loopstates.com`) over HTTPS to process audit validations, compile companion archives, probe external link reachability, and serve starter templates.

- **Audited Content & URLs**: Submitted URLs or pasted markdown contents are transmitted to the Linten Cloud API solely for real-time validation and companion synthesis.
- **Transient Processing**: All content is processed in-memory and is neither stored on persistent databases nor used to train AI models.
- **Link Reachability Probes**: Target URLs declared in `llms.txt` files are verified for HTTP status reachability through high-concurrency cloud worker requests.
- **Private Network Safeguards**: Private network addresses (`localhost`, private IP subnets, and cloud link-local metadata addresses) are rejected to protect internal infrastructure.

---

## License

MIT © [Loopstates](https://loopstates.com). All rights reserved.
