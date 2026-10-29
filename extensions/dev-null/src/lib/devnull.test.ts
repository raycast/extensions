import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPayload, parseCommitAnswer, postCommit, prepareCommit } from "./devnull";

describe("buildPayload", () => {
  const now = new Date("2026-10-20T00:00:00Z");

  it("has four lines without images: time, nonce, empty reply-to, message", () => {
    const [time, nonce, replyTo, ...message] = buildPayload("hi\nthere", [], now).split("\n");
    expect(time).toBe("1792454400");
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(replyTo).toBe("");
    expect(message.join("\n")).toBe("hi\nthere");
  });

  it("puts the comma-separated image hashes on a line before the message", () => {
    const lines = buildPayload("hi", ["a".repeat(64), "b".repeat(64)], now).split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[3]).toBe(`${"a".repeat(64)},${"b".repeat(64)}`);
    expect(lines[4]).toBe("hi");
  });
});

describe("prepareCommit", () => {
  it("treats blank image paths, which models send for an empty field, as no image", async () => {
    await expect(prepareCommit({ message: "hi", imagePaths: ["", "  "] })).resolves.toMatchObject({ images: [] });
  });
});

describe("postCommit", () => {
  // Nothing listens on port 9, so reaching the network would fail with "Could not reach".
  const offline = { baseUrl: "http://127.0.0.1:9", agentSockets: [], home: "/nonexistent" };

  it("refuses a commit /dev/null would refuse before looking for keys or sending anything", async () => {
    await expect(postCommit({ message: "x".repeat(4001) }, offline)).rejects.toThrow(
      `${(4001).toLocaleString()} of ${(4000).toLocaleString()}`,
    );
    await expect(postCommit({ message: "hi", imagePaths: ["/nonexistent/a.png"] }, offline)).rejects.toThrow(
      "Could not read the image a.png.",
    );
  });

  it("moves on from an SSH agent that never answers", { timeout: 20_000 }, async () => {
    // A socket that accepts connections and never replies, like a wedged agent.
    const socket = join(mkdtempSync(join(tmpdir(), "devnull-agent-")), "s");
    const server = createServer(() => undefined).listen(socket);
    try {
      await expect(postCommit({ message: "hi" }, { ...offline, agentSockets: [socket] })).rejects.toThrow("No Ed25519");
    } finally {
      server.close();
    }
  });

  it("refuses an image whose bytes changed after the user approved it", async () => {
    // The smallest valid PNG: 1x1, one gray pixel.
    const path = join(mkdtempSync(join(tmpdir(), "devnull-approved-")), "shot.png");
    writeFileSync(
      path,
      Buffer.from(
        "89504e470d0a1a0a0000000d4948445200000001000000010800000000" +
          "3a7e9b550000000a49444154789c63600000000200015ee1c2e40000000049454e44ae426082",
        "hex",
      ),
    );
    const { images } = await prepareCommit({ message: "hi", imagePaths: [path] });
    await expect(
      postCommit({ message: "hi", imagePaths: [path] }, { ...offline, approvedImageHashes: ["0".repeat(64)] }),
    ).rejects.toThrow("changed after you approved");
    // The hashes the user actually approved get past the check, and on to the (offline) network.
    await expect(
      postCommit({ message: "hi", imagePaths: [path] }, { ...offline, approvedImageHashes: [images[0].sha256] }),
    ).rejects.toThrow(/No Ed25519|Could not reach/);
  });
});

describe("postCommit's approval log", () => {
  const offline = { baseUrl: "http://127.0.0.1:9", agentSockets: [], home: "/nonexistent" };

  async function approvalLogged(approvedImageHashes: string[] | null | undefined) {
    const lines: Record<string, unknown>[] = [];
    const log = (message: string, data?: Record<string, unknown>) => message === "Checked commit" && lines.push(data!);
    await postCommit({ message: "hi" }, { ...offline, log, approvedImageHashes }).catch(() => undefined);
    return lines[0]?.approval;
  }

  it("tells a post with no approval step from an AI post whose approval went missing", async () => {
    // The form has no approval step.
    expect(await approvalLogged(undefined)).toBe("not used");
    // The AI tool looked for the user's approval and found none.
    expect(await approvalLogged(null)).toBe("not recorded");
    expect(await approvalLogged([])).toBe("matched");
  });
});

describe("parseCommitAnswer", () => {
  it("reads the link and the pending-review note", () => {
    expect(parseCommitAnswer("Committed: https://dev-null.sh/@u/commits/1\n")).toEqual({
      url: "https://dev-null.sh/@u/commits/1",
      pending: false,
    });
    expect(
      parseCommitAnswer(
        "Committed: https://dev-null.sh/@u/commits/1 (pending review, only you can see it until it is approved)\n",
      ).pending,
    ).toBe(true);
  });
});
