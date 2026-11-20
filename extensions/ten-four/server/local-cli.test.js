const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const CLI = path.resolve(__dirname, "../assets/tenfour");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `exit ${code}`));
    });
  });
}

test("the CLI creates a missing local-store directory", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tenfour-cli-"));
  const store = path.join(root, "not-created", "yet", "shelf.json");

  await run(process.execPath, [CLI, "first"], {
    env: { ...process.env, TENFOUR_FILE: store },
  });

  assert.equal(JSON.parse(fs.readFileSync(store, "utf8"))[0].text, "first");
});

test("the remote CLI sends the shelf bearer token", async () => {
  let authorization;
  const server = http.createServer((req, res) => {
    authorization = req.headers.authorization;
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "remote",
        label: "remote text",
        text: "remote text",
        ts: 0,
        pinned: false,
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const url = `http://127.0.0.1:${server.address().port}/shelf`;
    await run(process.execPath, [CLI, "remote text"], {
      env: {
        ...process.env,
        TENFOUR_URL: url,
        TENFOUR_TOKEN: "cli-test-token",
      },
    });
    assert.equal(authorization, "Bearer cli-test-token");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("the remote CLI rejects plaintext non-loopback URLs", async () => {
  await assert.rejects(
    () =>
      run(process.execPath, [CLI, "secret"], {
        env: {
          ...process.env,
          TENFOUR_URL: "http://example.com/shelf",
          TENFOUR_TOKEN: "cli-test-token",
        },
      }),
    /HTTPS/,
  );
});

test("the CLI waits for a live writer whose lock is old", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tenfour-cli-"));
  const store = path.join(root, "shelf.json");
  const lock = `${store}.lock`;
  fs.writeFileSync(store, "[]");
  const holder = spawn(
    process.execPath,
    [
      "-e",
      `
        const fs = require("fs");
        const { execFileSync } = require("child_process");
        const [store, lock] = process.argv.slice(1);
        const fd = fs.openSync(lock, "wx");
        const startedAt = execFileSync(
          "ps",
          ["-o", "lstart=", "-p", String(process.pid)],
          { encoding: "utf8" },
        ).trim();
        fs.writeFileSync(
          fd,
          JSON.stringify({
            pid: process.pid,
            fingerprint: true,
            startedAt,
            token: "writer",
          }),
        );
        const snapshot = JSON.parse(fs.readFileSync(store, "utf8"));
        fs.utimesSync(lock, new Date(0), new Date(Date.now() - 3000));
        setTimeout(() => {
          snapshot.push({ id: "slow", text: "slow" });
          fs.writeFileSync(store, JSON.stringify(snapshot));
          fs.closeSync(fd);
          try {
            fs.unlinkSync(lock);
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        }, 2300);
      `,
      store,
      lock,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const holderDone = new Promise((resolve, reject) =>
    holder.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`writer exit ${code}`)),
    ),
  );

  const start = Date.now();
  while (!fs.existsSync(lock)) {
    if (Date.now() - start > 2000) throw new Error("writer never locked");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  await run(process.execPath, [CLI, "after-slow"], {
    env: { ...process.env, TENFOUR_FILE: store },
  });
  await holderDone;

  const texts = JSON.parse(fs.readFileSync(store, "utf8")).map(
    (item) => item.text,
  );
  assert.deepEqual(new Set(texts), new Set(["slow", "after-slow"]));
});

test("the CLI reclaims an old lock without a process fingerprint", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tenfour-cli-"));
  const store = path.join(root, "shelf.json");
  const lock = `${store}.lock`;
  fs.writeFileSync(store, "[]");
  fs.writeFileSync(
    lock,
    JSON.stringify({
      pid: process.pid,
      fingerprint: true,
      startedAt: null,
      token: "missing-fingerprint",
    }),
  );
  fs.utimesSync(lock, new Date(0), new Date(Date.now() - 3000));

  const child = spawn(process.execPath, [CLI, "reclaimed"], {
    env: { ...process.env, TENFOUR_FILE: store },
    stdio: ["ignore", "ignore", "pipe"],
  });
  const exitCode = await Promise.race([
    new Promise((resolve) => child.on("close", resolve)),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 500)),
  ]);
  if (exitCode === "timeout") child.kill();

  assert.equal(exitCode, 0, "CLI remained blocked by a missing fingerprint");
  assert.equal(JSON.parse(fs.readFileSync(store, "utf8"))[0].text, "reclaimed");
});
