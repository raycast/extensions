import { describe, expect, it } from "vitest";
import {
  agentLogo,
  appLocations,
  chatLink,
  failures,
  findMash,
  hasDesktopApp,
  installLocations,
  literal,
  liveSearchArguments,
  MashError,
  parseChats,
  parseSearch,
  mashEnvironment,
  parseStreamLine,
  resumeCommand,
  rows,
  viewArguments,
  viewChoice,
  parseView,
  recentChatsArguments,
  rendered,
  searchCommand,
  searchLink,
  settle,
  stillComing,
  streamArguments,
} from "./mash";

describe("finding mash", () => {
  const home = "/Users/ada";
  it("uses the configured location only when it exists", () => {
    expect(findMash("/opt/mash", home, () => true)).toBe("/opt/mash");
    expect(findMash("/opt/mash", home, () => false)).toBeUndefined();
  });
  it("otherwise tries the install locations in order", () => {
    const installed = new Set(["/opt/homebrew/bin/mash", "/Applications/Mash.app/Contents/MacOS/mash"]);
    expect(findMash(undefined, home, (path) => installed.has(path))).toBe("/opt/homebrew/bin/mash");
    expect(findMash("  ", home, () => false)).toBeUndefined();
    expect(installLocations(home)[0]).toBe("/Users/ada/.local/bin/mash");
    expect(installLocations(home)).toContain("/Users/ada/Applications/Mash.app/Contents/MacOS/mash");
  });
  it("finds the desktop app in either Applications folder", () => {
    expect(appLocations(home)).toEqual(["/Applications/Mash.app", "/Users/ada/Applications/Mash.app"]);
    expect(hasDesktopApp(home, (path) => path === "/Users/ada/Applications/Mash.app")).toBe(true);
    expect(hasDesktopApp(home, () => false)).toBe(false);
  });
});

describe("reading Mash's answers", () => {
  it("asks for a live search of this machine", () => {
    expect(liveSearchArguments("deplo")).toEqual(["search", "deplo", "--live", "--limit", "20"]);
  });

  it("reads each chat at its best matching message", () => {
    const hits = parseSearch(
      JSON.stringify({
        results: [
          {
            chat_id: "c1",
            provider: "claude-code",
            title: "  Fix the deploy retry loop ",
            project: "/work/infra",
            updated_at: 1_794_690_968_860,
            matches: [{ message_id: "m3", snippet: " the deploy step retries forever " }],
          },
          { chat_id: "c2", title: "No match recorded", matches: [] },
        ],
      }),
    );
    expect(hits).toEqual([
      {
        chatId: "c1",
        messageId: "m3",
        matched: true,
        title: "Fix the deploy retry loop",
        agent: "claude-code",
        project: "/work/infra",
        updatedAt: new Date(1_794_690_968_860),
        passage: "the deploy step retries forever",
        matches: [{ messageId: "m3", passage: "the deploy step retries forever" }],
      },
    ]);
  });

  it("lists this machine's recent chats, each at its first message", () => {
    expect(recentChatsArguments()).toEqual(["list-chats", "--local", "--exclude-subagents", "--limit", "20"]);
    const chats = parseChats(
      JSON.stringify({
        chats: [
          {
            chat_id: "c9",
            provider: "codex",
            title: "Rotate the logs",
            project: "/work/ops",
            updated_at: 1_795_409_863_721,
            lookup: { view: { id: "first" } },
          },
          { chat_id: "c10", title: "Nothing to read" },
        ],
        next_offset: null,
      }),
    );
    expect(chats).toEqual([
      {
        chatId: "c9",
        messageId: "first",
        matched: false,
        title: "Rotate the logs",
        agent: "codex",
        project: "/work/ops",
        updatedAt: new Date(1_795_409_863_721),
        passage: "",
      },
    ]);
  });

  it("passes on Mash's own message when it fails", () => {
    const failed = JSON.stringify({
      error: { kind: "unavailable", message: "Start Qdrant with `mash qdrant install`." },
    });
    expect(() => parseSearch(failed)).toThrow(new MashError("Start Qdrant with `mash qdrant install`."));
    expect(() => parseSearch("not json")).toThrow(MashError);
  });

  it("reads the messages around a match", () => {
    const view = JSON.stringify({ messages: [{ id: "m2", role: "user", content: "why?" }, { id: "m3" }] });
    expect(parseView(view)).toEqual([
      { id: "m2", role: "user", content: "why?" },
      { id: "m3", role: "message", content: "" },
    ]);
  });
});

describe("subagent chats", () => {
  const chat = (id: string, subagent?: object) => ({
    chat_id: id,
    provider: "claude-code",
    title: id,
    lookup: { view: { id: `${id}-m` } },
    ...(subagent ? { subagent } : {}),
  });
  const fork = { parent_chat_id: "p", label: "Fix the build", role: "fork", depth: 1 };

  it("marks search matches in subagent chats, and only those", () => {
    const row = (id: string, subagent?: object) => ({
      chat_id: id,
      provider: "claude-code",
      title: id,
      matches: [{ message_id: `${id}-m`, snippet: "x" }],
      ...(subagent ? { subagent } : {}),
    });
    const hits = parseSearch(JSON.stringify({ results: [row("mine"), row("sub", fork)] }));
    expect(hits.map((hit) => [hit.chatId, hit.subagent ?? false])).toEqual([
      ["mine", false],
      ["sub", true],
    ]);
  });

  it("names a subagent chat by its task label, not its prompt", () => {
    const prompted = { ...chat("sub", fork), title: "<fork-boilerplate> You are a worker fork." };
    const unlabelled = { ...chat("bare", { parent_chat_id: "p" }), title: "Its own prompt" };
    const [labelled, bare] = parseChats(JSON.stringify({ chats: [prompted, unlabelled] }));
    expect(labelled?.title).toBe("Fix the build");
    expect(bare?.title).toBe("Its own prompt");
  });

  it("does not take a null subagent field for a subagent", () => {
    const [hit] = parseChats(JSON.stringify({ chats: [{ ...chat("mine"), subagent: null }] }));
    expect(hit?.subagent).toBeUndefined();
  });
});

describe("links and untrusted text", () => {
  it("opens a chat or the full search in the desktop app", () => {
    expect(chatLink({ chatId: "a/b", messageId: "m 1", matched: true })).toBe("mash://chat/a%2Fb?message=m+1");
    expect(chatLink({ chatId: "a/b", messageId: "first", matched: false })).toBe("mash://chat/a%2Fb");
    // Another machine's chat names it, as the desktop app's links do.
    expect(chatLink({ chatId: "c", messageId: "m", matched: true, machine: "build box" })).toBe(
      "mash://chat/c?node=build+box&message=m",
    );
    expect(chatLink({ chatId: "c", messageId: "first", matched: false, machine: "xenia" })).toBe(
      "mash://chat/c?node=xenia",
    );
    expect(searchLink(" checkout outage ")).toBe("mash://search?q=checkout+outage");
  });

  it("quotes the words of the terminal search command", () => {
    expect(searchCommand(" deploy retry ")).toBe("mash search 'deploy retry'");
    expect(searchCommand("don't")).toBe("mash search 'don'\\''t'");
  });

  it("shows history as literal text, never as Markdown that loads or links", () => {
    const shown = literal("![x](https://example.com/p.png) ``` escape");
    expect(shown.startsWith("````text\n")).toBe(true);
    expect(shown.endsWith("\n````")).toBe(true);
    expect(literal("abcdef", 3)).toBe("```text\nabc…\n```");
  });

  it("renders history as Markdown without loading images or HTML", () => {
    expect(rendered("**bold** and `Vec<T>` stay")).toBe("**bold** and `Vec<T>` stay");
    expect(rendered("see ![x](https://example.com/p.png)")).toBe("see \\![x](https://example.com/p.png)");
    expect(rendered('<img src="https://example.com/p.png"> a < b')).toBe(
      '&lt;img src="https://example.com/p.png"> a < b',
    );
    expect(rendered("```html\n<img src=x>\n```\n<b>")).toBe("```html\n<img src=x>\n```\n&lt;b>");
    expect(rendered("abcdef", 3)).toBe("abc…");
  });

  it("knows each agent's logo, and nothing for an unknown one", () => {
    expect(agentLogo("claude-code")).toEqual({ file: "claude.svg", tint: "#d97757" });
    expect(agentLogo("codex")).toEqual({ file: "openai.svg" });
    expect(agentLogo("someone-else")).toBeUndefined();
  });
});

describe("federated search", () => {
  const row = (chat: string, matchedBy: string[], node?: string) => ({
    chat_id: chat,
    provider: "codex",
    title: chat,
    ...(node ? { node_id: node } : {}),
    matches: [{ message_id: `${chat}-m`, snippet: "words" }],
    matched_by: matchedBy,
  });

  it("asks every source in the scope while typing", () => {
    expect(streamArguments("invoice exports", "all")).toEqual([
      "search",
      "invoice exports",
      "--live",
      "--stream",
      "--limit",
      "20",
      "--scope",
      "all",
    ]);
  });

  it("leaves subagent chats to Mash to leave out, unless the reader asks for them", () => {
    expect(streamArguments("invoice exports", "local", true).slice(-3)).toEqual([
      "--scope",
      "local",
      "--include-subagents",
    ]);
  });

  it("reads one line: the merged list, which chats only meaning found, and each source", () => {
    const update = parseStreamLine(
      JSON.stringify({
        done: false,
        results: [row("a", ["words", "meaning"]), row("b", ["meaning"]), row("c", ["machines"], "xenia")],
        sources: [
          { label: "laptop", state: "done", count: 2 },
          { label: "xenia", state: "searching" },
        ],
      }),
    );
    expect(update.hits.map((hit) => [hit.chatId, hit.byMeaning ?? false, hit.machine])).toEqual([
      ["a", false, undefined],
      ["b", true, undefined],
      ["c", false, "xenia"],
    ]);
    expect(update.done).toBe(false);
    expect(stillComing(update.sources)).toBe("Searching xenia…");
    expect(() => parseStreamLine('{"error":{"message":"no index"}}')).toThrow("no index");
  });

  it("keeps rows in place once frozen and adds new ones below", () => {
    const hits = (...ids: string[]) =>
      ids.map((chatId) => ({ ...parseStreamLine(JSON.stringify({ results: [row(chatId, ["words"])] })).hits[0]! }));
    const shown = hits("a", "b");
    expect(settle(shown, hits("c", "a", "b"), false).map((hit) => hit.chatId)).toEqual(["c", "a", "b"]);
    expect(settle(shown, hits("c", "a", "b"), true).map((hit) => hit.chatId)).toEqual(["a", "b", "c"]);
  });

  it("names sources that failed so the reader can try again", () => {
    expect(
      failures([
        { label: "build-box", state: "failed", timedOut: true },
        { label: "xenia", state: "failed", message: "offline" },
        { label: "laptop", state: "done" },
      ]),
    ).toBe("build-box didn’t answer · xenia: offline");
  });
});

describe("chats or messages", () => {
  const result = {
    chat_id: "c1",
    provider: "codex",
    title: "Rotate the logs",
    matches: [
      { message_id: "m1", snippet: "rotate daily" },
      { message_id: "m2", snippet: "keep a week" },
    ],
  };
  const other = { chat_id: "c2", provider: "codex", title: "Other", matches: [{ message_id: "m3", snippet: "logs" }] };

  it("keeps every match a chat result carries, the best first", () => {
    const [hit] = parseSearch(JSON.stringify({ results: [result] }));
    expect(hit?.messageId).toBe("m1");
    expect(hit?.matches?.map((match) => match.messageId)).toEqual(["m1", "m2"]);
  });

  it("lists one row per chat, or one per matching message in the chats' order", () => {
    const hits = parseSearch(JSON.stringify({ results: [result, other] }));
    expect(rows(hits, "chats").map((hit) => hit.chatId)).toEqual(["c1", "c2"]);
    expect(rows(hits, "messages").map((hit) => [hit.chatId, hit.messageId, hit.passage])).toEqual([
      ["c1", "m1", "rotate daily"],
      ["c1", "m2", "keep a week"],
      ["c2", "m3", "logs"],
    ]);
  });

  it("reads the dropdown's choice, falling back to chats on every machine", () => {
    expect(viewChoice("messages:local")).toEqual({ show: "messages", scope: "local" });
    expect(viewChoice("chats:all")).toEqual({ show: "chats", scope: "all" });
    expect(viewChoice("sideways")).toEqual({ show: "chats", scope: "all" });
  });
});

describe("resuming a chat in its agent", () => {
  const chat = { agent: "claude-code", chatId: "3cd8e223-aea3", project: "/work/it's here" };

  it("resumes Claude Code and Codex sessions in the folder they ran in", () => {
    expect(resumeCommand(chat)).toBe("cd '/work/it'\\''s here' && claude --resume 3cd8e223-aea3");
    expect(resumeCommand({ ...chat, agent: "codex", project: "" })).toBe("codex resume 3cd8e223-aea3");
  });

  it("offers nothing it could not resume here", () => {
    expect(resumeCommand({ ...chat, subagent: true })).toBeUndefined();
    expect(resumeCommand({ ...chat, machine: "xenia" })).toBeUndefined();
    expect(resumeCommand({ ...chat, agent: "cursor" })).toBeUndefined();
    expect(resumeCommand({ ...chat, chatId: "x; rm -rf ~" })).toBeUndefined();
  });
});

describe("the environment mash runs in", () => {
  it("names Raycast as the caller for Mash's usage log, keeping the rest", () => {
    expect(mashEnvironment({ PATH: "/usr/bin", HOME: "/Users/me" })).toEqual({
      PATH: "/usr/bin",
      HOME: "/Users/me",
      MASH_CLIENT: "raycast",
    });
  });
});

describe("reading a chat's messages", () => {
  it("reads another machine's message from the shared index, by that machine", () => {
    expect(viewArguments({ messageId: "m1" })).toEqual(["view", "m1", "--context", "3"]);
    expect(viewArguments({ messageId: "m1", machine: "dev-macbook" })).toEqual([
      "view",
      "m1",
      "--context",
      "3",
      "--shared",
      "dev-macbook",
    ]);
  });
});
