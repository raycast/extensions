import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readdir, open, unlink, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withCacheLock } from "../src/lib/cache-lock.ts";
import { PreviewCache } from "../src/lib/preview-cache.ts";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  const mode = process.argv[2],
    directory = process.argv[3];
  if (mode === "holder" || mode === "choosing") {
    const hold = async () => {
      console.log("READY");
      await new Promise(() => {
        setInterval(() => {}, 1000);
      });
    };
    if (mode === "holder") await withCacheLock(directory, hold);
    else {
      await mkdir(
        join(directory, ".admission-v2", `${process.pid}-${randomUUID()}`),
        { recursive: true },
      );
      await hold();
    }
    return;
  }
  if (mode === "contender") {
    for (let i = 0; i < 20; i++)
      await withCacheLock(directory, async () => {
        // Exclusive creation is an independent oracle for overlapping entry.
        const marker = join(directory, "critical-section");
        const file = await open(marker, "wx");
        await file.close();
        await pause(5);
        await unlink(marker);
      });
    return;
  }
  const root = await mkdtemp(join(tmpdir(), "rosetta-lock-recovery-"));
  const children: ChildProcess[] = [];
  function worker(kind: string) {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", process.argv[1], kind, root],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    children.push(child);
    let errors = "";
    child.stderr.on("data", (data) => {
      errors += String(data);
    });
    const done = new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code, signal) =>
        code === 0 || signal === "SIGKILL"
          ? resolve()
          : reject(new Error(errors || `Exit ${code}`)),
      );
    });
    void done.catch(() => {});
    return { child, done };
  }
  try {
    for (const kind of ["holder", "choosing"]) {
      const owner = worker(kind);
      await Promise.race([
        once(owner.child.stdout!, "data"),
        pause(3000).then(() => {
          throw new Error("Owner did not register");
        }),
      ]);
      owner.child.kill("SIGSTOP");
      let entered = false;
      try {
        await withCacheLock(
          root,
          async () => {
            entered = true;
          },
          100,
        );
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes("cache is busy")
        )
          throw error;
      }
      if (entered) throw new Error("Paused owner was stolen");
      owner.child.kill("SIGKILL");
      await owner.done;
      await Promise.all(
        Array.from({ length: 4 }, () => worker("contender").done),
      );
      if ((await readdir(join(root, ".admission-v2"))).length)
        throw new Error("Reservations leaked");
      console.log(
        `${kind}: paused owner protected; SIGKILL recovered; 80 exclusive entries across four processes.`,
      );
    }
    const cache = new PreviewCache(root);
    const spec = {
      easing: {
        kind: "bezier" as const,
        points: [0.42, 0, 0.58, 1] as [number, number, number, number],
      },
      duration: 0.5,
      component: "Toggle" as const,
      appearance: "dark" as const,
    };
    await cache.get(spec);
    if (!(await cache.get(spec)).cached)
      throw new Error("Recovered cache hit failed");
    console.log("Actual GIF generation and cache hit passed after recovery.");
  } finally {
    for (const child of children)
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await once(child, "exit");
      }
    await rm(root, { recursive: true, force: true });
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
