import { randomUUID } from "node:crypto";
import { createServer, IncomingMessage } from "node:http";
import { AddressInfo } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { describe, expect, it, vi } from "vitest";
import { AmplenoteApi, createApi, Task } from "../src/lib/api";
import { AmplenoteTimeoutError, AmplenoteUnavailableError, createToolCaller } from "../src/lib/mcp";
import { aNote, aTask, aTaskDomain, fakeAmplenote, secondsFromNow } from "./builders";

const state = vi.hoisted(() => ({ api: undefined as unknown as AmplenoteApi }));

vi.mock("../src/lib/amplenote", () => ({
  get amplenote() {
    return state.api;
  },
  dailyJotTag: "daily-jots",
  isDailyJot: (note: { tags: string[] }) => note.tags.includes("daily-jots"),
}));

const { default: getNote } = await import("../src/tools/get-note");
const { default: completeTask } = await import("../src/tools/complete-task");
const { default: addTask } = await import("../src/tools/add-task");
const { default: searchTasks } = await import("../src/tools/search-tasks");
const { default: getNoteTasks } = await import("../src/tools/get-note-tasks");
const { default: createNoteTool } = await import("../src/tools/create-note");

const use = (handlers: Parameters<typeof fakeAmplenote>[0]) => {
  const fake = fakeAmplenote(handlers);
  state.api = createApi(fake.call);
  return fake;
};

describe("vault notes", () => {
  it("are reported as locked instead of empty", async () => {
    const note = aNote({ name: "Passwords", vault: true });
    use({ getNoteMetadata: () => ({ note }), getNoteContent: () => ({ markdown: null }) });

    const result = (await getNote({ noteUUID: note.uuid })) as Record<string, unknown>;

    expect(result.content).toBeNull();
    expect(result.contentError).toMatch(/Vault/);
    expect(result.vault).toBe(true);
  });
});

describe("unreadable content", () => {
  it("is reported as unreadable, not as an empty note", async () => {
    const note = aNote({ name: "Odd" });
    use({ getNoteMetadata: () => ({ note }), getNoteContent: () => ({ markdown: null }) });

    const result = (await getNote({ noteUUID: note.uuid })) as Record<string, unknown>;

    expect(result.content).toBeNull();
    expect(result.contentError).toMatch(/Could not load/);
  });
});

describe("writes that time out", () => {
  it("warn that the note may have been created, so the AI checks before retrying", async () => {
    use({
      createNote: () => {
        throw new AmplenoteTimeoutError();
      },
    });
    await expect(createNoteTool({ name: "Plan" })).rejects.toThrow(/may have been (created|saved)/i);
  });
});

describe("not-found reporting", () => {
  it("reports real errors as errors, not as a missing task", async () => {
    use({
      getTask: () => {
        throw new Error("Internal server error");
      },
    });
    await expect(completeTask({ taskUUID: "t1" })).rejects.toThrow("Internal server error");
  });

  it("still reports a missing task as not found", async () => {
    use({ getTask: () => ({ task: null }) });
    await expect(completeTask({ taskUUID: "t1" })).rejects.toThrow('No task with id "t1"');
  });

  it("treats Amplenote's validation error for unknown note ids as not found", async () => {
    use({
      getNoteMetadata: () => {
        throw new Error("Output validation error: Invalid structured content for tool getNoteMetadata");
      },
      getNoteContent: () => ({ markdown: "" }),
    });
    await expect(getNote({ noteUUID: "missing" })).rejects.toThrow('No note with id "missing"');
  });
});

describe("add-task task-domain status", () => {
  it("adds the task even when task domains cannot be loaded, and says membership is unknown", async () => {
    const inbox = aNote({ name: "Inbox" });
    const fake = use({
      filterNotes: () => ({ notes: [inbox] }),
      insertTask: () => ({ taskUUID: "new" }),
      getTaskDomains: () => {
        throw new Error("tool error");
      },
    });

    const result = await addTask({ content: "Call Bob", noteName: "Inbox" });

    expect(fake.callsTo("insertTask")).toHaveLength(1);
    expect(result?.inTaskDomain).toBeNull();
  });

  it("says membership is unknown for a note that was just created", async () => {
    use({
      filterNotes: () => ({ notes: [] }),
      createNote: () => ({ noteUUID: "local-1" }),
      getNoteMetadata: () => ({ note: aNote({ uuid: "local-1" }) }),
      insertTask: () => ({ taskUUID: "new" }),
      getTaskDomains: () => ({ taskDomains: [aTaskDomain()] }),
    });

    const result = await addTask({ content: "Call Bob" });

    expect(result?.inTaskDomain).toBeNull();
  });
});

describe("search-tasks completeness", () => {
  const note = aNote({ name: "Home", tags: ["home"] });
  const visible = aTask({ noteUUID: note.uuid, content: "Visible" });
  const hidden = aTask({ noteUUID: note.uuid, content: "Later", hideUntil: secondsFromNow(3600) });
  const handlers = (notes = [note], tasks: Task[] = [visible, hidden]) => ({
    filterNotes: () => ({ notes }),
    getTaskDomains: () => ({ taskDomains: [aTaskDomain()] }),
    getTaskDomainTasks: () => ({ tasks }),
    getNoteMetadata: ({ noteUUID }: Record<string, unknown>) => ({
      note: noteUUID === pluginNote.uuid ? pluginNote : null,
    }),
  });
  const pluginNote = aNote({ name: "Dashboard", tags: ["plugins/dashboard", "home"] });

  it("tells how many tasks are hidden and can include them", async () => {
    use(handlers());
    const result = (await searchTasks({})) as Record<string, unknown>;
    expect(result.total).toBe(1);
    expect(result.hiddenCount).toBe(1);

    const all = await searchTasks({ includeHidden: true });
    expect(all?.tasks.map((task) => task.title).sort()).toEqual(["Later", "Visible"]);
  });

  it("keeps note names and tag filters for tasks in notes missing from the note list", async () => {
    const task = aTask({ noteUUID: pluginNote.uuid, content: "Plugin task" });
    use(handlers([note], [task]));

    const result = await searchTasks({ tag: "home" });

    expect(result?.tasks.map((t) => [t.title, t.noteName])).toEqual([["Plugin task", "Dashboard"]]);
  });
});

describe("lookups by name", () => {
  it("find plugin notes, which are only hidden from lists", async () => {
    const pluginNote = aNote({ name: "My Plugin", tags: ["plugins/dashboard"] });
    use({ filterNotes: () => ({ notes: [pluginNote] }), getNoteTasks: () => ({ tasks: [] }) });

    const result = await getNoteTasks({ noteName: "My Plugin" });

    expect(result?.noteUUID).toBe(pluginNote.uuid);
  });
});

/** A real MCP server with tools that answer slowly, never, or with garbage. */
async function startServer({ ignoreFirstRequest = false } = {}) {
  let ignored = !ignoreFirstRequest;
  const sessions = new Map<string, StreamableHTTPServerTransport>();
  const readBody = async (request: IncomingMessage) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
  };
  const server = createServer(async (request, response) => {
    const sessionId = request.headers["mcp-session-id"] as string | undefined;
    const body = await readBody(request);
    if (!ignored) {
      ignored = true;
      return; // never answer: simulates Amplenote hanging while it starts up
    }
    let transport = sessionId ? sessions.get(sessionId) : undefined;
    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (id) => void sessions.set(id, transport!),
      });
      const mcp = new McpServer({ name: "fake-amplenote", version: "1.0.0" });
      mcp.tool("slow", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] };
      });
      mcp.tool("hang", async () => new Promise<never>(() => undefined));
      mcp.tool("getTags", async () => ({ content: [{ type: "text", text: "this is not json" }] }));
      await mcp.connect(transport);
    }
    await transport.handleRequest(request, response, body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

describe("MCP transport", () => {
  it("reports a request that takes too long as Amplenote being unreachable", async () => {
    const server = await startServer();
    try {
      const call = createToolCaller(server.url, "token", { timeoutMs: 200 });
      await expect(call("hang")).rejects.toBeInstanceOf(AmplenoteUnavailableError);
    } finally {
      await server.close();
    }
  });

  it("recovers when setting up the connection timed out", async () => {
    const server = await startServer({ ignoreFirstRequest: true });
    try {
      const call = createToolCaller(server.url, "token", { timeoutMs: 200 });
      await expect(call("slow")).rejects.toBeInstanceOf(AmplenoteUnavailableError);
      await expect(call<{ ok: boolean }>("slow")).resolves.toEqual({ ok: true });
    } finally {
      await server.close();
    }
  });

  it("does not abort other requests when one request fails", async () => {
    const server = await startServer();
    try {
      const call = createToolCaller(server.url, "token", { timeoutMs: 150 });
      await call("slow").catch(() => undefined);
      // "hang" times out at 150 ms while "slow" (started at 100 ms, done at 200 ms) is still running.
      const later = new Promise((resolve) => setTimeout(resolve, 100)).then(() => call<{ ok: boolean }>("slow"));
      const [hung, slow] = await Promise.allSettled([call("hang"), later]);
      expect(hung.status).toBe("rejected");
      expect(slow).toEqual({ status: "fulfilled", value: { ok: true } });
    } finally {
      await server.close();
    }
  });

  it("explains unexpected responses instead of returning them as data", async () => {
    const server = await startServer();
    try {
      await expect(createApi(createToolCaller(server.url, "token")).getTags()).rejects.toThrow(/unexpected response/i);
    } finally {
      await server.close();
    }
  });
});
