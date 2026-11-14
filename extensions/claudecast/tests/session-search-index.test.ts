import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  getSearchPathIdentity,
  isPathWithinAllowedRoots,
  parseSessionSearchQuery,
  readSessionMatchContext,
  readSessionSearchManifest,
  SearchIndexAbortError,
  searchSessionIndex,
  updateSessionSearchIndex,
  type SearchIndexSource,
} from "../src/lib/session-search-index.ts";

async function fixture(t: test.TestContext) {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-search-index-"),
  );
  const transcripts = path.join(root, "transcripts");
  const index = path.join(root, "index");
  await fs.promises.mkdir(transcripts, { recursive: true });
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });
  return { root, transcripts, index };
}

function jsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

async function sourceFor(
  filePath: string,
  projectPath = "/work/alpha",
): Promise<SearchIndexSource> {
  const stat = await fs.promises.stat(filePath);
  return {
    filePath,
    sourceProjectDir: path.dirname(filePath),
    projectPath,
    projectName: path.basename(projectPath),
    mtimeMs: stat.mtimeMs,
    size: stat.size,
  };
}

async function hits(index: string, query: string) {
  const found: Array<{
    sourcePath: string;
    sessionId: string;
    snippet: string;
    match: {
      stableMessageId: string;
      sourceStart: number;
      sourceEnd: number;
      recordIndex: number;
      messageIndex?: number;
      role: "user" | "assistant" | "summary";
      query?: string;
    };
  }> = [];
  await searchSessionIndex(index, query, (hit) => {
    found.push({
      sourcePath: hit.session.sourcePath,
      sessionId: hit.session.sessionId,
      snippet: hit.matchSnippet,
      match: hit.match,
    });
  });
  return found;
}

test("builds an initial index across transcript fixtures", async (t) => {
  const { transcripts, index } = await fixture(t);
  const alpha = path.join(transcripts, "alpha.jsonl");
  const beta = path.join(transcripts, "beta.jsonl");
  await fs.promises.writeFile(
    alpha,
    [
      jsonLine({ type: "summary", summary: "Unicode café", leafUuid: "a" }),
      jsonLine({
        type: "user",
        permissionMode: "plan",
        message: { role: "user", content: "Find the launch regression" },
      }),
      jsonLine({
        type: "assistant",
        message: {
          role: "assistant",
          model: "claude-sonnet-5",
          content: [
            { type: "text", text: "The regression is in `src/start.ts`." },
            { type: "image", source: { data: "secret-image-data" } },
            {
              type: "tool_use",
              input: { file_path: "/work/alpha/src/start.ts" },
            },
          ],
        },
      }),
    ].join(""),
  );
  await fs.promises.writeFile(
    beta,
    [
      "malformed json\n",
      jsonLine({
        type: "user",
        message: { role: "user", content: "A separate beta transcript" },
      }),
    ].join(""),
  );

  const phases: string[] = [];
  const manifest = await updateSessionSearchIndex(
    index,
    [await sourceFor(alpha), await sourceFor(beta, "/work/beta")],
    { onStatus: (status) => phases.push(status.phase) },
  );

  assert.equal(Object.keys(manifest.files).length, 2);
  assert.ok(manifest.committedCorpusBytes > 0);
  assert.equal(phases[0], "Initial Indexing");
  assert.equal((await hits(index, "launch regression")).length, 1);
  assert.equal((await hits(index, "café"))[0]?.sessionId, "a");
  assert.equal((await hits(index, "secret-image-data")).length, 0);
  const alphaEntry = Object.values(manifest.files).find(
    (entry) => entry.sourcePath === alpha,
  );
  assert.equal(alphaEntry?.turnCount, 2);
  assert.equal(alphaEntry?.model, "claude-sonnet-5");
  assert.equal(alphaEntry?.permissionMode, "plan");
  assert.deepEqual(alphaEntry?.mentionedFiles, ["/work/alpha/src/start.ts"]);
});

test("manifest reads surface filesystem failures", async (t) => {
  const { index } = await fixture(t);
  await fs.promises.mkdir(path.join(index, "manifest.json"), {
    recursive: true,
  });
  await assert.rejects(readSessionSearchManifest(index), (error: unknown) => {
    const code = (error as NodeJS.ErrnoException)?.code;
    return code === "EISDIR" || code === "EACCES" || code === "EPERM";
  });
});

test("rewrites unchanged transcripts when authoritative project metadata changes", async (t) => {
  const { transcripts, index } = await fixture(t);
  const transcript = path.join(transcripts, "session.jsonl");
  await fs.promises.writeFile(
    transcript,
    jsonLine({ type: "user", message: { content: "metadata path" } }),
  );
  const initial = await sourceFor(transcript, "/work/lossy-path");
  await updateSessionSearchIndex(index, [initial]);

  await updateSessionSearchIndex(index, [
    {
      ...initial,
      projectPath: "/work/exact_path",
      projectName: "exact_path",
    },
  ]);

  const manifest = await readSessionSearchManifest(index);
  const indexed = Object.values(manifest.files)[0];
  assert.equal(indexed.projectPath, "/work/exact_path");
  assert.equal(indexed.projectName, "exact_path");
});

test("does not read unchanged transcripts when reopening", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "unchanged.jsonl");
  await fs.promises.writeFile(
    filePath,
    jsonLine({
      type: "user",
      message: { role: "user", content: "unchanged content" },
    }),
  );
  const source = await sourceFor(filePath);
  await updateSessionSearchIndex(index, [source]);

  let transcriptReads = 0;
  await updateSessionSearchIndex(index, [await sourceFor(filePath)], {
    testHooks: { onTranscriptRead: () => transcriptReads++ },
  });
  assert.equal(transcriptReads, 0);
});

test("indexes appended JSONL content once", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "append.jsonl");
  await fs.promises.writeFile(
    filePath,
    jsonLine({
      type: "user",
      message: { role: "user", content: "before append" },
    }),
  );
  await updateSessionSearchIndex(index, [await sourceFor(filePath)]);
  const before = await readSessionSearchManifest(index);

  await fs.promises.appendFile(
    filePath,
    jsonLine({
      type: "assistant",
      message: { role: "assistant", content: "new appended marker" },
    }),
  );
  const starts: number[] = [];
  await updateSessionSearchIndex(index, [await sourceFor(filePath)], {
    testHooks: {
      onTranscriptRead: (_sourcePath, start) => starts.push(start),
    },
  });
  const after = await readSessionSearchManifest(index);
  const entry = Object.values(after.files)[0];

  assert.ok(starts.includes(Object.values(before.files)[0].indexedBytes));
  assert.equal(entry.turnCount, 2);
  const [appendedHit] = await hits(index, "new appended marker");
  assert.ok(appendedHit);
  const context = await readSessionMatchContext(filePath, appendedHit.match, {
    allowedRoots: [transcripts],
    projectPath: transcripts,
  });
  assert.equal(
    context.messages.find((message) => message.matched)?.messageIndex,
    1,
  );
});

test("drops stale tail data after a file shrink or rewrite", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "rewrite.jsonl");
  await fs.promises.writeFile(
    filePath,
    jsonLine({
      type: "user",
      message: {
        role: "user",
        content: "old stale marker with enough padding to make this longer",
      },
    }),
  );
  await updateSessionSearchIndex(index, [await sourceFor(filePath)]);

  await fs.promises.writeFile(
    filePath,
    jsonLine({
      type: "user",
      message: { role: "user", content: "fresh marker" },
    }),
  );
  await updateSessionSearchIndex(index, [await sourceFor(filePath)]);

  assert.equal((await hits(index, "old stale marker")).length, 0);
  assert.equal((await hits(index, "fresh marker")).length, 1);
});

test("recovers an interrupted append without duplicate hits", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "interrupted.jsonl");
  await fs.promises.writeFile(
    filePath,
    jsonLine({
      type: "user",
      message: { role: "user", content: "initial marker" },
    }),
  );
  await updateSessionSearchIndex(index, [await sourceFor(filePath)]);
  const committed = (await readSessionSearchManifest(index))
    .committedCorpusBytes;
  await fs.promises.appendFile(
    filePath,
    jsonLine({
      type: "assistant",
      message: { role: "assistant", content: "interrupted marker" },
    }),
  );

  await assert.rejects(
    updateSessionSearchIndex(index, [await sourceFor(filePath)], {
      testHooks: {
        afterCorpusAppend: () => {
          throw new Error("simulated interruption");
        },
      },
    }),
    /simulated interruption/,
  );
  assert.ok(
    (await fs.promises.stat(path.join(index, "corpus.txt"))).size > committed,
  );

  await updateSessionSearchIndex(index, [await sourceFor(filePath)]);
  assert.equal((await hits(index, "interrupted marker")).length, 1);
  const corpus = await fs.promises.readFile(
    path.join(index, "corpus.txt"),
    "utf8",
  );
  assert.equal(corpus.match(/interrupted marker/g)?.length, 1);
});

test("removes deleted sessions from search results", async (t) => {
  const { transcripts, index } = await fixture(t);
  const first = path.join(transcripts, "first.jsonl");
  const second = path.join(transcripts, "second.jsonl");
  await fs.promises.writeFile(
    first,
    jsonLine({
      type: "user",
      message: { role: "user", content: "deleted session marker" },
    }),
  );
  await fs.promises.writeFile(
    second,
    jsonLine({
      type: "user",
      message: { role: "user", content: "retained session marker" },
    }),
  );
  await updateSessionSearchIndex(index, [
    await sourceFor(first),
    await sourceFor(second),
  ]);
  await fs.promises.rm(first);
  await updateSessionSearchIndex(index, [await sourceFor(second)]);

  assert.equal((await hits(index, "deleted session marker")).length, 0);
  assert.equal((await hits(index, "retained session marker")).length, 1);
});

test("orders duplicate session IDs deterministically", async (t) => {
  const { transcripts, index } = await fixture(t);
  const first = path.join(transcripts, "a.jsonl");
  const second = path.join(transcripts, "b.jsonl");
  for (const filePath of [first, second]) {
    await fs.promises.writeFile(
      filePath,
      [
        jsonLine({ type: "summary", summary: "shared", leafUuid: "same-id" }),
        jsonLine({
          type: "user",
          message: { role: "user", content: "duplicate marker" },
        }),
      ].join(""),
    );
  }
  const sameTime = new Date("2026-08-23T10:00:00.000Z");
  await Promise.all([
    fs.promises.utimes(first, sameTime, sameTime),
    fs.promises.utimes(second, sameTime, sameTime),
  ]);
  await updateSessionSearchIndex(index, [
    await sourceFor(second),
    await sourceFor(first),
  ]);

  const found = await hits(index, "duplicate marker");
  assert.deepEqual(
    found.map((item) => item.sessionId),
    ["same-id", "same-id"],
  );
  assert.deepEqual(
    found.map((item) => item.sourcePath),
    [first, second],
  );
});

test("handles CRLF, malformed JSONL, invalid UTF-8, images, and long lines", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "edge-cases.jsonl");
  const invalidUtf8 = new Uint8Array([
    ...new TextEncoder().encode(
      '{"type":"user","message":{"role":"user","content":"bad ',
    ),
    0xff,
    ...new TextEncoder().encode(' byte"}}\r\n'),
  ]);
  const longLine = jsonLine({
    type: "assistant",
    message: { role: "assistant", content: "x".repeat(2 * 1024 * 1024) },
  });
  const payload = new Uint8Array([
    ...new TextEncoder().encode("not json\r\n"),
    ...invalidUtf8,
    ...new TextEncoder().encode(longLine),
    ...new TextEncoder().encode(
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            { type: "image", source: { data: "ignored image marker" } },
            { type: "text", text: "edge case marker" },
            { type: "tool_use", input: { path: "src/edge.ts" } },
          ],
        },
      }) + "\r\n",
    ),
  ]);
  await fs.promises.writeFile(filePath, payload);

  const manifest = await updateSessionSearchIndex(index, [
    await sourceFor(filePath),
  ]);
  assert.equal((await hits(index, "edge case marker")).length, 1);
  assert.equal((await hits(index, "ignored image marker")).length, 0);
  assert.deepEqual(Object.values(manifest.files)[0].mentionedFiles, [
    "/work/alpha/src/edge.ts",
  ]);
});

test("cancels indexing and search", async (t) => {
  const { transcripts, index } = await fixture(t);
  const first = path.join(transcripts, "cancel-a.jsonl");
  const second = path.join(transcripts, "cancel-b.jsonl");
  for (const filePath of [first, second]) {
    await fs.promises.writeFile(
      filePath,
      jsonLine({
        type: "user",
        message: { role: "user", content: "cancel marker" },
      }),
    );
  }
  const indexingController = new AbortController();
  await assert.rejects(
    updateSessionSearchIndex(
      index,
      [await sourceFor(first), await sourceFor(second)],
      {
        signal: indexingController.signal,
        testHooks: {
          onTranscriptRead: () => indexingController.abort(),
        },
      },
    ),
    SearchIndexAbortError,
  );

  await updateSessionSearchIndex(index, [
    await sourceFor(first),
    await sourceFor(second),
  ]);
  const searchController = new AbortController();
  await assert.rejects(
    searchSessionIndex(index, "cancel marker", () => searchController.abort(), {
      signal: searchController.signal,
    }),
    SearchIndexAbortError,
  );
});

test("parses directory filters and Windows path identities", () => {
  assert.deepEqual(parseSessionSearchQuery('dir:"Work Alpha" timeout error'), {
    content: "timeout error",
    directory: "Work Alpha",
  });
  assert.deepEqual(parseSessionSearchQuery("project:beta failure"), {
    content: "failure",
    directory: "beta",
  });
  assert.equal(
    getSearchPathIdentity("C:\\Users\\Me\\Repo\\A.jsonl", "win32"),
    getSearchPathIdentity("c:\\users\\me\\repo\\a.JSONL", "win32"),
  );
  assert.equal(
    getSearchPathIdentity("\\\\Server\\Share\\Logs\\A.jsonl", "win32"),
    "\\\\server\\share\\logs\\a.jsonl",
  );
});

test("carries an exact message location and reads bounded surrounding context", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "exact.jsonl");
  const lines = Array.from({ length: 12 }, (_, messageIndex) =>
    jsonLine({
      type: messageIndex % 2 === 0 ? "user" : "assistant",
      uuid: `message-${messageIndex}`,
      message: {
        role: messageIndex % 2 === 0 ? "user" : "assistant",
        content:
          messageIndex === 7
            ? `${"prefix ".repeat(100)}exact navigation marker${" suffix".repeat(100)}`
            : `context message ${messageIndex}`,
      },
    }),
  ).join("");
  await fs.promises.writeFile(filePath, lines);
  await updateSessionSearchIndex(index, [await sourceFor(filePath)]);

  const [hit] = await hits(index, "exact navigation marker");
  assert.equal(hit.match.stableMessageId, "message-7");
  assert.equal(hit.match.messageIndex, 7);
  assert.equal(hit.match.role, "assistant");
  assert.equal(hit.match.query, "exact navigation marker");

  const context = await readSessionMatchContext(filePath, hit.match, {
    allowedRoots: [transcripts],
    projectPath: transcripts,
    before: 2,
    after: 2,
    maxContentChars: 160,
  });
  assert.equal(context.totalMessageCount, 12);
  assert.equal(context.messages.length, 5);
  assert.deepEqual(
    context.messages.map((message) => message.messageIndex),
    [5, 6, 7, 8, 9],
  );
  assert.equal(
    context.messages.find((message) => message.matched)?.stableMessageId,
    "message-7",
  );
  assert.match(
    context.messages.find((message) => message.matched)?.content ?? "",
    /exact navigation marker/,
  );
  assert.ok(context.messages.every((message) => message.content.length <= 160));
});

test("keeps duplicate session IDs navigable by exact transcript path", async (t) => {
  const { transcripts, index } = await fixture(t);
  const first = path.join(transcripts, "duplicate-a.jsonl");
  const second = path.join(transcripts, "duplicate-b.jsonl");
  await fs.promises.writeFile(
    first,
    [
      jsonLine({ type: "summary", summary: "First", leafUuid: "shared-id" }),
      jsonLine({
        type: "user",
        uuid: "first-message",
        message: { role: "user", content: "shared exact marker first" },
      }),
    ].join(""),
  );
  await fs.promises.writeFile(
    second,
    [
      jsonLine({ type: "summary", summary: "Second", leafUuid: "shared-id" }),
      jsonLine({
        type: "user",
        uuid: "second-message",
        message: { role: "user", content: "shared exact marker second" },
      }),
    ].join(""),
  );
  await updateSessionSearchIndex(index, [
    await sourceFor(first),
    await sourceFor(second),
  ]);

  const found = await hits(index, "shared exact marker");
  assert.equal(found.length, 2);
  const contexts = await Promise.all(
    found.map((hit) =>
      readSessionMatchContext(hit.sourcePath, hit.match, {
        allowedRoots: [transcripts],
        projectPath: transcripts,
      }),
    ),
  );
  assert.deepEqual(
    found
      .map((hit, index) => [
        path.basename(hit.sourcePath),
        contexts[index].messages.find((message) => message.matched)
          ?.stableMessageId,
      ])
      .sort(),
    [
      ["duplicate-a.jsonl", "first-message"],
      ["duplicate-b.jsonl", "second-message"],
    ],
  );
});

test("validates referenced files and inline screenshots inside allowed roots", async (t) => {
  const { root, transcripts, index } = await fixture(t);
  const project = path.join(root, "project");
  const shots = path.join(project, "shots");
  const outside = path.join(root, "outside");
  await Promise.all([
    fs.promises.mkdir(shots, { recursive: true }),
    fs.promises.mkdir(outside, { recursive: true }),
  ]);
  const screenshot = path.join(shots, "screen.png");
  const sourceFile = path.join(project, "src.ts");
  const escaped = path.join(outside, "secret.png");
  await Promise.all([
    fs.promises.writeFile(screenshot, new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
    fs.promises.writeFile(sourceFile, "export {};\n"),
    fs.promises.writeFile(escaped, "private"),
  ]);
  const filePath = path.join(transcripts, "screenshots.jsonl");
  await fs.promises.writeFile(
    filePath,
    jsonLine({
      type: "user",
      uuid: "screenshot-message",
      message: {
        role: "user",
        content:
          "screenshot marker [Image: source: shots/screen.png] `src.ts` " +
          "[Image: source: ../outside/secret.png]",
      },
    }),
  );
  await updateSessionSearchIndex(index, [await sourceFor(filePath, project)]);
  const [hit] = await hits(index, "screenshot marker");
  const context = await readSessionMatchContext(filePath, hit.match, {
    allowedRoots: [transcripts, project],
    projectPath: project,
  });

  const realScreenshot = await fs.promises.realpath(screenshot);
  const realSourceFile = await fs.promises.realpath(sourceFile);
  assert.deepEqual(
    context.referencedFiles.sort(),
    [realScreenshot, realSourceFile].sort(),
  );
  assert.deepEqual(context.imagePaths, [realScreenshot]);
  assert.equal(context.referencedFiles.includes(escaped), false);
});

test("rejects transcript and symlink paths that escape allowed roots", async (t) => {
  const { root, transcripts, index } = await fixture(t);
  const outside = path.join(root, "outside.jsonl");
  await fs.promises.writeFile(
    outside,
    jsonLine({
      type: "user",
      message: { role: "user", content: "outside marker" },
    }),
  );
  await updateSessionSearchIndex(index, [await sourceFor(outside)]);
  const [hit] = await hits(index, "outside marker");
  await assert.rejects(
    readSessionMatchContext(outside, hit.match, {
      allowedRoots: [transcripts],
      projectPath: transcripts,
    }),
    /Outside the Allowed Roots/,
  );

  const link = path.join(transcripts, "linked.jsonl");
  await fs.promises.symlink(outside, link);
  await assert.rejects(
    readSessionMatchContext(link, hit.match, {
      allowedRoots: [transcripts],
      projectPath: transcripts,
    }),
    /Outside the Allowed Roots/,
  );
});

test("cancels exact context reads", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "context-cancel.jsonl");
  await fs.promises.writeFile(
    filePath,
    jsonLine({
      type: "user",
      message: { role: "user", content: "context cancellation marker" },
    }),
  );
  await updateSessionSearchIndex(index, [await sourceFor(filePath)]);
  const [hit] = await hits(index, "context cancellation marker");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    readSessionMatchContext(filePath, hit.match, {
      allowedRoots: [transcripts],
      projectPath: transcripts,
      signal: controller.signal,
    }),
    SearchIndexAbortError,
  );
});

test("checks Windows drive and UNC roots without changing native paths", () => {
  assert.equal(
    isPathWithinAllowedRoots(
      "c:\\Work\\Repo\\shots\\screen.png",
      ["C:\\work\\repo"],
      "win32",
    ),
    true,
  );
  assert.equal(
    isPathWithinAllowedRoots(
      "C:\\Work\\Repository\\secret.png",
      ["C:\\Work\\Repo"],
      "win32",
    ),
    false,
  );
  assert.equal(
    isPathWithinAllowedRoots(
      "\\\\Server\\Share\\Repo\\screen.png",
      ["\\\\server\\share\\repo"],
      "win32",
    ),
    true,
  );
});

test("indexes validated source, branch, workspace, archive, and title metadata", async (t) => {
  const { transcripts, index } = await fixture(t);
  const filePath = path.join(transcripts, "metadata.jsonl");
  await fs.promises.writeFile(
    filePath,
    [
      jsonLine({
        type: "user",
        uuid: "metadata-message",
        entrypoint: "claude-vscode",
        gitBranch: "feature/session-inbox",
        message: { role: "user", content: "metadata search marker" },
      }),
      jsonLine({ type: "custom-title", customTitle: "Renamed Session" }),
    ].join(""),
  );
  const source = await sourceFor(filePath);
  source.inbox = {
    title: "Desktop Title",
    archived: true,
    workspacePath: "/work/alpha-worktree",
    desktopLocalSessionId: "local_metadata",
    desktopBridgeId: "cse_metadata",
    conductorWorkspaceId: "workspace-metadata",
    sources: [
      { backend: "claude-cli", nativePath: filePath },
      {
        backend: "claude-desktop",
        nativePath: "/metadata/local_metadata.json",
        externalId: "cse_metadata",
        state: "archived",
      },
      {
        backend: "conductor",
        nativePath: "/work/alpha-worktree",
        workspaceId: "workspace-metadata",
        state: "active",
      },
      {
        backend: "wsl",
        nativePath:
          "\\\\wsl.localhost\\Ubuntu Dev\\home\\me\\.claude\\projects\\session.jsonl",
        externalId: "Ubuntu Dev",
        linuxPath: "/home/me/Repo",
      },
    ],
  };

  const manifest = await updateSessionSearchIndex(index, [source]);
  const entry = Object.values(manifest.files)[0];
  assert.equal(entry.title, "Renamed Session");
  assert.equal(entry.entrypoint, "claude-vscode");
  assert.equal(entry.gitBranch, "feature/session-inbox");
  assert.equal(entry.workspacePath, "/work/alpha-worktree");
  assert.equal(entry.archived, true);
  assert.deepEqual(
    entry.sources.map((item) => item.backend),
    ["claude-cli", "claude-desktop", "conductor", "wsl", "vscode"],
  );
  assert.equal(
    entry.sources.find((item) => item.backend === "wsl")?.linuxPath,
    "/home/me/Repo",
  );
});
