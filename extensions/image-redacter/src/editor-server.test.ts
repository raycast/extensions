import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { request } from "node:http";
import { startEditorSession } from "./editor-server";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "cloakshot-server-"));
  await Promise.all(
    ["editor.html", "editor.css", "editor.js", "source.png"].map((name) =>
      writeFile(join(directory, name), name),
    ),
  );
  return directory;
}

test("serves only the token-bound local session and preserves source bytes", async () => {
  const directory = await fixture();
  const session = await startEditorSession(
    join(directory, "source.png"),
    "image/png",
    { filename: "source.png" },
    { assetsPath: directory },
  );
  try {
    assert.equal((await fetch(new URL("/source", session.url))).status, 404);
    const reboundStatus = await new Promise<number | undefined>(
      (resolve, reject) => {
        request(
          session.url,
          { headers: { Host: "attacker.example" } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        )
          .on("error", reject)
          .end();
      },
    );
    assert.equal(reboundStatus, 403);
    assert.equal(
      (
        await fetch(session.url, {
          headers: { Origin: "https://attacker.example" },
        })
      ).status,
      403,
    );
    assert.equal((await fetch(session.url, { method: "POST" })).status, 405);
    for (const resource of [
      "",
      "editor.css",
      "editor.js",
      "config",
      "source",
    ]) {
      const response = await fetch(new URL(resource, session.url));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    await session.loaded;
    assert.equal((await fetch(new URL("ping", session.url))).status, 204);
    assert.equal(
      await readFile(join(directory, "source.png"), "utf8"),
      "source.png",
    );
  } finally {
    await session.close();
    await rm(directory, { recursive: true });
  }
});

test("an editor that never loads rejects instead of reporting success", async () => {
  const directory = await fixture();
  const session = await startEditorSession(
    join(directory, "source.png"),
    "image/png",
    {},
    { assetsPath: directory, loadTimeoutMs: 30 },
  );
  try {
    await assert.rejects(session.loaded, /did not finish loading/);
  } finally {
    await session.close();
    await rm(directory, { recursive: true });
  }
});
