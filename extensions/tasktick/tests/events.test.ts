import { describe, it, expect } from "vitest";
import { EventsStream } from "../src/lib/events";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function makeFakeCli(body: string): string {
    const dir = mkdtempSync(join(tmpdir(), "tt-cli-"));
    const path = join(dir, "tasktick");
    writeFileSync(path, `#!/bin/sh\n${body}`);
    chmodSync(path, 0o755);
    return path;
}

/**
 * Poll `predicate` until it returns true or `timeoutMs` elapses. Replaces
 * fixed-duration sleeps: spawning a subprocess + echoing + readline parsing
 * has no fixed latency, so a hardcoded wait (e.g. 200ms) flakes under load.
 */
async function waitFor(
    predicate: () => boolean,
    timeoutMs = 4000,
    pollMs = 10,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
        }
        await new Promise((r) => setTimeout(r, pollMs));
    }
}

describe("EventsStream", () => {
    it("emits parsed events from NDJSON stdout", async () => {
        const cli = makeFakeCli(
            'echo \'{"type":"started","id":"abc","executionId":"e1","ts":"t"}\'\n' +
            'echo \'{"type":"completed","id":"abc","executionId":"e1","exitCode":0,"ts":"t"}\'\n' +
            'sleep 5'
        );
        const stream = new EventsStream(cli);
        const events: any[] = [];
        stream.on("started", (ev) => events.push({ type: "started", ...ev }));
        stream.on("completed", (ev) => events.push({ type: "completed", ...ev }));
        await waitFor(() => events.length >= 2);
        stream.kill();
        expect(events).toHaveLength(2);
        expect(events[0].type).toBe("started");
        expect(events[1].exitCode).toBe(0);
    });

    it("does not respawn after explicit kill", async () => {
        const cli = makeFakeCli("sleep 5");
        const stream = new EventsStream(cli);
        await new Promise((r) => setTimeout(r, 50));
        stream.kill();
        await new Promise((r) => setTimeout(r, 200));
        expect(stream.isAlive()).toBe(false);
    });

    it("retries with backoff after unexpected exit", async () => {
        const dir = mkdtempSync(join(tmpdir(), "tt-retry-"));
        const counterFile = join(dir, "counter");
        writeFileSync(counterFile, "0");
        const cliPath = join(dir, "tasktick");
        writeFileSync(cliPath, `#!/bin/sh\nn=$(cat "${counterFile}")\necho $((n+1)) > "${counterFile}"\nexit 1`);
        chmodSync(cliPath, 0o755);

        const stream = new EventsStream(cliPath, { initialBackoffMs: 20, maxBackoffMs: 100 });
        await waitFor(() => parseInt(readFileSync(counterFile, "utf8")) > 1);
        stream.kill();

        const finalCount = parseInt(readFileSync(counterFile, "utf8"));
        expect(finalCount).toBeGreaterThan(1);
    });
});
