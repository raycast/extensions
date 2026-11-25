import { describe, expect, it } from "vitest";
import {
  agentApps,
  claudeOwnedSessions,
  claudeSessionsFolder,
  installedAgentApps,
  isClaudeSessionFile,
  openInAgentApp,
} from "./agentApps";

const home = "/Users/ada";
const codexThread = "01a1b649-827e-7692-a5b1-0de415a69df5";
const claudeSession = "586f44fa-8aaa-4587-b69f-b763d3279ef1";
const plist = (scheme: string) => `<plist><array><string>${scheme}</string></array></plist>`;

describe("finding agents' desktop apps", () => {
  it("counts an app only when it registers its agent's scheme", () => {
    const files: Record<string, string> = {
      "/Applications/ChatGPT.app/Contents/Info.plist": plist("codex"),
      "/Users/ada/Applications/Claude.app/Contents/Info.plist": plist("claude"),
    };
    expect(installedAgentApps(home, (path) => files[path]).map((app) => app.name)).toEqual(["Codex", "Claude"]);
    const older = { "/Applications/ChatGPT.app/Contents/Info.plist": plist("chatgpt") };
    expect(installedAgentApps(home, (path) => older[path as keyof typeof older])).toEqual([]);
  });
});

describe("which sessions the Claude app owns", () => {
  const folder = `${claudeSessionsFolder(home)}/account/org`;
  it("reads the session files' own transcript IDs", () => {
    const files: Record<string, string> = {
      [`${folder}/local_a.json`]: JSON.stringify({ sessionId: "local_a", cliSessionId: claudeSession }),
      // Mentioning an ID elsewhere does not make the app its owner.
      [`${folder}/local_b.json`]: JSON.stringify({ cliSessionId: "other", note: codexThread }),
      [`${folder}/local_c.json`]: "not json " + codexThread,
    };
    const owned = claudeOwnedSessions(Object.keys(files), [claudeSession, codexThread], (path) => files[path]);
    expect([...owned]).toEqual([claudeSession]);
  });
  it("knows a session's file by its name", () => {
    expect(isClaudeSessionFile("local_ff035225-64f9-485b-9009-07919aa70811.json")).toBe(true);
    expect(isClaudeSessionFile("archived-sessions.idx")).toBe(false);
    expect(isClaudeSessionFile("scheduled-tasks.json")).toBe(false);
  });
});

describe("the link to a chat in its agent's app", () => {
  const all = agentApps;
  it("opens a Codex thread at its ID", () => {
    expect(openInAgentApp({ agent: "codex", chatId: codexThread }, all, new Set())).toEqual({
      title: "Open in Codex",
      url: `codex://threads/${codexThread}`,
    });
  });
  it("opens a Claude session only when the app owns it", () => {
    const chat = { agent: "claude-code", chatId: claudeSession };
    // A session the app does not have yet is added to it, and the title says so.
    expect(openInAgentApp(chat, all, new Set())).toEqual({
      title: "Add to Claude",
      url: `claude://resume?session=${claudeSession}`,
    });
    // The folder goes along, with every special character encoded.
    expect(openInAgentApp({ ...chat, project: "/work/a b&c#d/é" }, all, new Set([claudeSession]))).toEqual({
      title: "Open in Claude",
      url: `claude://resume?session=${claudeSession}&cwd=%2Fwork%2Fa%20b%26c%23d%2F%C3%A9`,
    });
    expect(openInAgentApp(chat, all, new Set([claudeSession]))).toEqual({
      title: "Open in Claude",
      url: `claude://resume?session=${claudeSession}`,
    });
  });
  it("offers nothing without the app, for subagent chats or for other agents", () => {
    expect(openInAgentApp({ agent: "codex", chatId: codexThread }, [], new Set())).toBeUndefined();
    expect(openInAgentApp({ agent: "codex", chatId: "50cf5623ea898883ead39971" }, all, new Set())).toBeUndefined();
    expect(openInAgentApp({ agent: "cursor", chatId: codexThread }, all, new Set())).toBeUndefined();
    // Another machine's session is not in this machine's apps.
    expect(openInAgentApp({ agent: "codex", chatId: codexThread, machine: "xenia" }, all, new Set())).toBeUndefined();
  });
});
