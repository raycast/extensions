# Linten for Raycast

The definitive developer utility for auditing `llms.txt` files, probing link reachability, estimating frontier AI token budgets, and synthesizing companion `llms-full.txt` archives directly from your keyboard.

Engineered by [Loopstates](https://loopstates.com) to empower AI agent readiness, crawler discovery, and context-window optimization.

---

## Features

### 1. Audit llms.txt
* **Spec v2 AST Linting**: Validates markdown structure, headers, and section formatting.
* **100-Link Health Probe**: High-concurrency link reachability checks streaming HTTP 200 OK, 301/302 redirects, and 404 broken statuses with sub-second latencies.
* **Frontier Token Budgeting**: Live token metrics for Gemini 2.0 (1M), Claude 3.5 Sonnet (200k), GPT-4o (128k), and DeepSeek-V3 (64k).
* **Action Menu**: One-click actions to compile companion archives, copy official README badges, or launch the Linten Web Inspector.

### 2. Compile llms-full.txt
* **Companion Synthesis**: Automatically parses declared documentation links from any remote URL or clipboard markdown.
* **Instant Clipboard Delivery**: Extracts clean markdown content, strips boilerplate navigation, and copies the entire companion bundle directly to your macOS clipboard ready for Claude Projects, ChatGPT, or Cursor.
* **Zero Local Overhead**: Powered entirely by the central [Linten Cloud API](https://linten.apps.loopstates.com).

---

## Getting Started

1. Install the extension from the Raycast Store.
2. Open Raycast (`Option + Space`).
3. Run **Audit llms.txt** or **Compile llms-full.txt**.
4. Paste any documentation URL (e.g. `acme.com/llms.txt`) or let Linten automatically read your clipboard.

---

## License

MIT © [Loopstates](https://loopstates.com). All rights reserved.
