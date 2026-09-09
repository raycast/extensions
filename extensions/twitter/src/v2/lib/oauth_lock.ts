import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { createServer, Server } from "node:net";
import { setTimeout } from "node:timers/promises";

async function acquireLock(): Promise<Server> {
  // Raycast commands can share a backend PID. A filesystem lock owned by that
  // PID survives a terminated command worker. The OS closes this listener when
  // its worker exits, including when JavaScript finally blocks cannot run.
  // Use the installation's support path so commands and AI tools share a lock.
  const hash = createHash("sha256").update(environment.supportPath).digest();
  const port = 49152 + (hash.readUInt32BE(0) % 16384);
  const deadline = Date.now() + 15_000;
  while (true) {
    const server = createServer((socket) => socket.destroy());
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen({ host: "127.0.0.1", port, exclusive: true }, resolve);
      });
      return server;
    } catch (error) {
      server.close();
      if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
      if (Date.now() >= deadline) {
        throw new Error("X authentication is busy. Finish any open X login, then retry.");
      }
      await setTimeout(100);
    }
  }
}

export async function withOAuthLock<T>(operation: () => Promise<T>): Promise<T> {
  const server = await acquireLock();
  try {
    return await operation();
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}
