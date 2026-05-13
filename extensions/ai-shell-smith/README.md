# ⚡️ AI Shell Smith

> Describe what you want in plain English — get a shell command worth running.

**AI Shell Smith** is a sharp little bridge between fuzzy intent and runnable CLI. Plug in OpenAI, Perplexity, or local Ollama; optionally pull live docs via Context7 — then grab the command from **Raycast** or pipe the same brain through the **standalone CLI**.

![Demo](media/demo.gif)

🧠 Natural language → shell · 🔄 Smart cache · 📜 Persistent history · 🖥 Multiple terminals  

---

## ✨ Why bother?

| You type… | You get… |
|-----------|----------|
| *“Show disk usage sorted by folder”* | A real `du` / `dust` command, ready to tweak |
| *“Bump version in package.json”* | A focused one-liner, not ten tabs of Stack Overflow |

It’s opinionated toward **actually useful terminal work** — git, npm, Docker, macOS quirks, the usual suspects.

---

## 🚀 Raycast (recommended)

1. Install from the **Raycast Store** (when published) or build with `npm run build` / `ray build`
2. Open **Preferences** → **AI Shell Smith**
3. Pick a provider and drop in the right key

**Providers**

- 🤖 **OpenAI** — fast models + optional **GPT-5 Search** for web-grounded answers  
- 🔮 **Perplexity** — `sonar-pro` out of the box  
- 🦙 **Ollama** — local / self-hosted; API key optional  
- 📚 **Context7** *(optional)* — fresher library docs before it answers [`context7.com`](https://context7.com)

**Power moves**

- ⌘↩ **Copy** the command  
- ⌘**T** **Run** in your favorite terminal (Warp, iTerm, Terminal.app, …)  
- ⌘⌥**X** **Drop** a line from history  
- ⌘**L** **Jump** to preferences  

---

## 🛡️ Safety (read this once)

AI suggests text; **you** decide what runs. Glance at anything involving `rm`, `sudo`, `DROP`, `curl | sh`, or mass renames before you hit Enter. Execution only happens when **you** choose it — nothing auto-runs in the background.

---

## 🧰 CLI

For scripts, aliases, or “just give me the command in the terminal”:

```bash
OPENAI_API_KEY=sk-... bun run src/cli.ts "list the 10 largest files here"
```

More options and env vars → **[ENGINE.md](./ENGINE.md)**

---

## 🧱 What’s inside

| Piece | Role |
|-------|------|
| `engine.ts` | Providers, Context7 path, cache, LLM calls |
| `cache.ts` | In-memory LRU + short TTL (snappy repeats) |
| `history.ts` | Shell history parsing (zsh / bash / fish) |
| `context.ts` | CWD, git root, shell flavor |
| `utils.ts` | Raycast storage + AppleScript terminal dispatch |

Full map → **[ARCHITECTURE.md](./ARCHITECTURE.md)**

---

## 🔧 Dev quick start

```bash
bun install   # or npm install
bun test
bun run typecheck
ray develop   # from the extension root when using Raycast tooling
```

**Platform:** macOS (Terminal integration uses AppleScript).

---

## 🌿 Git remotes (this repo)

| Remote | Points to |
|--------|-----------|
| `origin` | Your canonical app repo → `LivioGama/ai-shell-smith` |
| `upstream` | Official Raycast extensions monorepo → `raycast/extensions` |
| `raycast-fork` | Your fork for Store PRs → `LivioGama/raycast-extensions` |

Example: `git fetch raycast-fork` then work on branch `ext/ai-shell-smith` over there for PRs to [`raycast/extensions`](https://github.com/raycast/extensions).

---

## 📄 License

MIT — do fun things, own the consequences of the commands you run.
