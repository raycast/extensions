const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
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
        const [store, lock] = process.argv.slice(1);
        const fd = fs.openSync(lock, "wx");
        fs.writeFileSync(fd, \`\${process.pid}-writer\`);
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
