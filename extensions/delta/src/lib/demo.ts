/**
 * Made-up threads and CLI answers for taking Store screenshots without showing real work. Only
 * available while developing (`npm run dev`); the Store build never turns it on.
 */
import { Cache, environment } from "@raycast/api";
import { toDeltaError } from "./cli";
import { Organization, Thread, ThreadSummary } from "./types";

const cache = new Cache();
const DEMO_CACHE_KEY = "demo-data";

export function isDemoMode(): boolean {
  return environment.isDevelopment && cache.get(DEMO_CACHE_KEY) === "on";
}

export function setDemoMode(on: boolean): void {
  if (on) {
    cache.set(DEMO_CACHE_KEY, "on");
  } else {
    cache.remove(DEMO_CACHE_KEY);
  }
}

interface DemoThread {
  name: string;
  summary: string;
  keywords: string[];
  intents: string[];
  decisions: string[];
  todo: string[];
  files: [path: string, why: string][];
  model: string;
  daysAgo: number;
  archived?: boolean;
}

const DEMO_THREADS: DemoThread[] = [
  {
    name: "Semantic search for the docs site",
    summary:
      "Added semantic search to the docs with pgvector embeddings and hybrid ranking, so queries like “how do I rotate keys” find the right page even without exact words.",
    keywords: ["search", "pgvector", "embeddings", "Postgres", "docs"],
    intents: ["Make docs search understand questions", "Keep results under 200 ms"],
    decisions: [
      "Store embeddings in Postgres with pgvector instead of a separate vector database",
      "Rank with a 70/30 mix of vector similarity and full-text score",
      "Re-embed pages on publish, not on a nightly job",
    ],
    todo: ["Add search analytics to spot queries with no clicks", "Tune chunk size for long API pages"],
    files: [
      ["db/migrations/0042_page_embeddings.sql", "adds the vector column and HNSW index"],
      ["src/search/hybrid.ts", "combines vector and full-text scores"],
      ["src/publish/embed-on-publish.ts", "embeds a page when it's published"],
    ],
    model: "anthropic/claude-opus-5-5",
    daysAgo: 0.1,
  },
  {
    name: "Passkey sign-in for the web app",
    summary:
      "Replaced magic links with passkeys using WebAuthn, with a fallback to email codes on devices without a platform authenticator.",
    keywords: ["passkeys", "WebAuthn", "auth", "sign-in", "security"],
    intents: ["Let users sign in without passwords", "Keep a fallback for older devices"],
    decisions: [
      "Use discoverable credentials so users don't type an email first",
      "Keep email one-time codes as the fallback, drop magic links",
      "Store credentials per device, up to 10 per account",
    ],
    todo: ["Add a passkey management page in settings", "Write the migration email for existing users"],
    files: [
      ["app/(auth)/sign-in/page.tsx", "new passkey-first sign-in screen"],
      ["lib/auth/webauthn.ts", "registration and assertion ceremonies"],
      ["prisma/schema.prisma", "adds the Credential model"],
    ],
    model: "openai/gpt-6.1",
    daysAgo: 0.6,
  },
  {
    name: "MCP server for the internal billing API",
    summary:
      "Built a Model Context Protocol server that exposes read-only billing tools (invoices, plans, usage) so agents can answer support questions.",
    keywords: ["MCP", "billing", "agents", "tools", "API"],
    intents: ["Let support agents look up billing data", "Never allow writes from agents"],
    decisions: [
      "Expose only read tools: get_invoice, list_usage, get_plan",
      "Authenticate with short-lived service tokens, not user sessions",
      "Redact card details before returning invoices",
    ],
    todo: ["Add rate limits per agent", "Publish the server to the internal registry"],
    files: [
      ["mcp/billing/server.ts", "tool definitions and handlers"],
      ["mcp/billing/redact.ts", "removes card and bank details"],
    ],
    model: "anthropic/claude-opus-5-5",
    daysAgo: 1.2,
  },
  {
    name: "Local-first sync with CRDTs",
    summary:
      "Moved the notes app to local-first storage with Automerge documents synced over WebSockets, so edits work offline and merge without conflicts.",
    keywords: ["sync", "CRDT", "Automerge", "offline", "local-first"],
    intents: ["Make editing work offline", "Merge concurrent edits without conflict dialogs"],
    decisions: [
      "Use Automerge for documents and keep metadata in SQLite",
      "Sync over a single WebSocket per device",
      "Compact document history weekly",
    ],
    todo: ["Measure memory on notes with long histories", "Add a sync status indicator"],
    files: [
      ["packages/sync/src/repo.ts", "document repo and storage adapter"],
      ["packages/sync/src/socket.ts", "WebSocket sync with reconnect"],
      ["apps/desktop/src/editor/useDoc.ts", "binds the editor to a document"],
    ],
    model: "anthropic/claude-sonnet-5-5",
    daysAgo: 2,
  },
  {
    name: "Liquid Glass redesign for the iOS app",
    summary:
      "Updated the iOS app for the new system design: translucent tab bar, glass toolbars and larger titles, with fallbacks for older iOS versions.",
    keywords: ["SwiftUI", "iOS", "design", "Liquid Glass", "tab bar"],
    intents: ["Match the new system look", "Keep the app usable on older iOS"],
    decisions: [
      "Adopt the system tab bar instead of the custom one",
      "Use glass only on navigation surfaces, not on content cards",
      "Gate new APIs with availability checks",
    ],
    todo: ["Check contrast of glass toolbars over photos", "Update App Store screenshots"],
    files: [
      ["App/Views/RootTabView.swift", "switches to the system tab bar"],
      ["App/Styles/GlassToolbar.swift", "glass toolbar with a fallback"],
    ],
    model: "openai/gpt-6.1",
    daysAgo: 3,
  },
  {
    name: "Move the API to Bun and Hono",
    summary:
      "Migrated the public API from Express on Node to Hono on Bun. Cold starts dropped from 900 ms to 120 ms and the test suite runs three times faster.",
    keywords: ["Bun", "Hono", "API", "migration", "performance"],
    intents: ["Cut cold start time", "Simplify the middleware stack"],
    decisions: [
      "Keep the route structure and port handlers one by one",
      "Replace Jest with bun test",
      "Run on Bun in production behind the existing load balancer",
    ],
    todo: ["Port the last two webhook handlers", "Remove Express from dependencies"],
    files: [
      ["src/app.ts", "Hono app and middleware"],
      ["src/routes/projects.ts", "first ported route group"],
      ["package.json", "scripts and dependencies for Bun"],
    ],
    model: "anthropic/claude-sonnet-5-5",
    daysAgo: 5,
  },
  {
    name: "Push notifications in the Expo app",
    summary:
      "Added push notifications to the Expo app with expo-notifications and a server-side queue, including per-channel settings and quiet hours.",
    keywords: ["Expo", "React Native", "push", "notifications", "mobile"],
    intents: ["Notify users about mentions and replies", "Respect quiet hours"],
    decisions: [
      "Send through Expo's push service rather than APNs and FCM directly",
      "Queue notifications and collapse bursts into one",
      "Ask for permission after the first mention, not on launch",
    ],
    todo: ["Add notification grouping on Android", "Handle revoked tokens"],
    files: [
      ["app/notifications/register.ts", "permission prompt and token upload"],
      ["server/jobs/send-push.ts", "queue worker with burst collapsing"],
    ],
    model: "openai/gpt-6.1",
    daysAgo: 8,
  },
  {
    name: "Rust image pipeline for uploads",
    summary:
      "Rewrote image resizing in Rust as a WebAssembly module used by the upload worker. Thumbnails render four times faster and memory stays flat.",
    keywords: ["Rust", "WebAssembly", "images", "uploads", "performance"],
    intents: ["Make uploads faster", "Stop the worker running out of memory"],
    decisions: [
      "Compile to WebAssembly instead of a native addon",
      "Generate AVIF and WebP, drop JPEG thumbnails",
      "Stream large images instead of loading them whole",
    ],
    todo: ["Add HEIC input support"],
    files: [
      ["crates/resize/src/lib.rs", "resizing and encoding"],
      ["workers/upload/src/thumbnails.ts", "calls the WebAssembly module"],
    ],
    model: "anthropic/claude-opus-5-5",
    daysAgo: 13,
  },
  {
    name: "Upgrade to Tailwind CSS v4",
    summary:
      "Upgraded the design system to Tailwind v4 with CSS-first configuration and the new color palette. All components kept their look.",
    keywords: ["Tailwind", "CSS", "design system", "upgrade"],
    intents: ["Move to CSS-first config", "Avoid visual regressions"],
    decisions: ["Move theme tokens into CSS variables", "Run visual regression tests before merging"],
    todo: [],
    files: [["styles/app.css", "theme tokens as CSS variables"]],
    model: "anthropic/claude-sonnet-5-5",
    daysAgo: 21,
    archived: true,
  },
  {
    name: "Release notes for version 3.0",
    summary: "Drafted release notes and the launch post for version 3.0 from merged pull requests.",
    keywords: ["release", "changelog", "launch"],
    intents: ["Summarize what changed for users"],
    decisions: ["Group changes by user benefit, not by team"],
    todo: [],
    files: [["CHANGELOG.md", "3.0 entry"]],
    model: "openai/gpt-6.1",
    daysAgo: 34,
    archived: true,
  },
];

const ORGANIZATIONS: Organization[] = [
  { id: "org_demo_northwind", name: "Northwind Labs", current: true },
  { id: "org_demo_personal", name: "Personal", current: false },
];

const threadId = (index: number) => `demo-thread-${index + 1}`;

function formatDeltaDate(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

function toThread(demo: DemoThread, index: number): Thread {
  const createdAt = new Date(Date.now() - demo.daysAgo * 24 * 60 * 60 * 1000);
  return {
    id: threadId(index),
    name: demo.name,
    archived: demo.archived ?? false,
    join_id: `demo${index + 1}`,
    status: null,
    created_at_utc: formatDeltaDate(createdAt),
    // Delta's creation order: the newest thread has the highest index.
    index: DEMO_THREADS.length - index,
    generated_title: null,
    summary: demo.summary,
    keywords: demo.keywords,
    intents: demo.intents,
  };
}

function findDemo(id: string): { demo: DemoThread; thread: Thread } | undefined {
  const index = DEMO_THREADS.findIndex((_, i) => threadId(i) === id);
  return index === -1 ? undefined : { demo: DEMO_THREADS[index], thread: toThread(DEMO_THREADS[index], index) };
}

function searchText(demo: DemoThread): string {
  return [demo.name, demo.summary, ...demo.keywords, ...demo.decisions, ...demo.files.flat()].join("\n").toLowerCase();
}

/** Threads matching any of the `|`-separated keywords, the way Delta's keyword groups match. */
function matchKeywords(group: string) {
  const alternatives = group.toLowerCase().split("|").filter(Boolean);
  return DEMO_THREADS.map((demo, index) => ({ demo, id: threadId(index), thread: toThread(demo, index) })).filter(
    ({ demo }) => alternatives.some((keyword) => searchText(demo).includes(keyword)),
  );
}

const bullets = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

function answerAbout(demo: DemoThread, question: string): string {
  const q = question.toLowerCase();
  if (/decid|decision/.test(q)) {
    return `Here is what the thread decided:\n\n${bullets(demo.decisions)}`;
  }
  if (/left|remain|todo|next|open/.test(q)) {
    return demo.todo.length > 0
      ? `Still open:\n\n${bullets(demo.todo)}\n\nEverything else from the plan is done.`
      : "Nothing is left: every task in the thread was finished.";
  }
  if (/file/.test(q)) {
    return `Changed files:\n\n${demo.files.map(([path, why]) => `- \`${path}\`: ${why}`).join("\n")}`;
  }
  return `${demo.summary}\n\n**Key decisions**\n\n${bullets(demo.decisions)}`;
}

function answerQuery(args: string[]): string {
  const question = args[args.indexOf("--") + 1] ?? "";
  const threadIds = args.flatMap((arg, i) => (args[i - 1] === "--thread" ? [arg] : []));
  const keywordIndex = args.indexOf("--keyword");

  const sources =
    threadIds.length > 0
      ? threadIds.flatMap((id) => {
          const found = findDemo(id);
          return found ? [{ demo: found.demo, id }] : [];
        })
      : matchKeywords(keywordIndex === -1 ? "" : args[keywordIndex + 1]).slice(0, 3);
  if (sources.length === 0) {
    throw toDeltaError("error: no threads matched the given filters", "No threads matched");
  }

  const [first, ...others] = sources;
  let answer = answerAbout(first.demo, question);
  if (threadIds.length === 0 && others.length > 0) {
    answer += `\n\nRelated work is in ${others.map(({ demo }) => `“${demo.name}”`).join(" and ")}.`;
  }
  return JSON.stringify({
    answer,
    sources: sources.map(({ demo, id }, index) => ({ id, name: demo.name, index })),
  });
}

function summarize(id: string): string {
  const found = findDemo(id);
  if (!found) {
    throw toDeltaError(`error: thread ${id} not found`, "Thread not found");
  }
  const { demo, thread } = found;
  const transcript = [
    `User: ${demo.intents.join(". ")}.`,
    `Assistant: ${demo.summary}`,
    `User: What did we decide?`,
    `Assistant: ${demo.decisions.join(". ")}.`,
  ].join("\n\n");
  const summary: ThreadSummary = {
    id,
    name: demo.name,
    transcript,
    messages: [0, 1, 2, 3].map((number) => ({
      number,
      role: number % 2 === 0 ? "user" : "assistant",
      created_at_utc: thread.created_at_utc,
    })),
    generated_title: null,
    summary: demo.summary,
    keywords: demo.keywords,
    intents: demo.intents,
  };
  return JSON.stringify([summary]);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** What the CLI would print for `args`, using the demo threads. Changes are accepted and forgotten. */
export async function runDemoCommand(args: string[]): Promise<string> {
  const [group, command] = args.filter((arg) => !arg.startsWith("--"));
  const target = args[args.indexOf("--") + 1];

  if (group === "thread" && command === "query") {
    await wait(1500); // Long enough to show the loading state.
    return answerQuery(args);
  }
  await wait(200);
  if (group === "thread") {
    switch (command) {
      case "list":
        return JSON.stringify(DEMO_THREADS.map(toThread));
      case "search": {
        const limit = Number(args[args.indexOf("--limit") + 1]) || 10;
        return JSON.stringify(
          matchKeywords(target ?? "")
            .slice(0, limit)
            .map(({ thread }) => thread),
        );
      }
      case "show":
        return summarize(target ?? "");
      case "create":
      case "fork":
        return JSON.stringify({ thread_id: `demo-thread-new-${Date.now()}` });
      default:
        return ""; // archive, share, invite, delete and the rest just succeed.
    }
  }
  if (group === "org") {
    return JSON.stringify({ operation: "listed", organizations: ORGANIZATIONS });
  }
  if (group === "update") {
    return JSON.stringify({
      status: "up_to_date",
      current_version: "0.25.0",
      latest_version: "0.25.0",
      can_install: true,
    });
  }
  return ""; // `open`: there's nothing to open for a made-up thread.
}

/** Stand-in for `--debug thread data`: just the model entries the model scan looks for. */
export function demoThreadData(id: string): string {
  const found = findDemo(id);
  if (!found) {
    return "";
  }
  const [provider, model] = found.demo.model.split("/");
  const entry = `{"model": {"provider": "${provider}", "model": "${model}"}}\n`;
  return entry.repeat(5 + (found.thread.index % 4));
}
