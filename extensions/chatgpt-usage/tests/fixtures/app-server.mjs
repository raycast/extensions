import { createInterface } from "node:readline";

const scenario = process.argv[2] || "success";
const input = createInterface({ input: process.stdin });
let initialized = false;
let handshake = false;
let accountRead = false;
let output = Promise.resolve();

function send(message) {
  const json = JSON.stringify(message);
  if (scenario === "chunked") {
    output = output.then(
      () =>
        new Promise((resolve) => {
          process.stdout.write(json.slice(0, 10));
          setTimeout(() => {
            process.stdout.write(`${json.slice(10)}\n`);
            resolve();
          }, 10);
        }),
    );
  } else {
    process.stdout.write(`${json}\n`);
  }
}

input.on("line", (line) => {
  const message = JSON.parse(line);
  if (scenario === "timeout") return;
  if (scenario === "exit") process.exit(1);
  if (scenario === "malformed") return process.stdout.write("not-json\n");

  if (message.method === "initialize") {
    if (scenario === "init-error") return send({ id: message.id, error: { code: -1, message: "sensitive error" } });
    initialized = true;
    return send({ id: message.id, result: { userAgent: "fixture" } });
  }
  if (message.method === "initialized") {
    handshake = initialized;
    return;
  }
  if (!handshake) process.exit(2);
  if (message.method === "account/read") {
    accountRead = true;
    const account =
      scenario === "signed-out"
        ? null
        : { type: scenario === "api-key" ? "apiKey" : "chatgpt", planType: "plus", email: "private@example.com" };
    return send({ id: message.id, result: { account } });
  }
  if (message.method === "account/rateLimits/read") {
    if (!accountRead) process.exit(3);
    if (scenario === "usage-error") return send({ id: message.id, error: { code: -1, message: "sensitive error" } });
    send({ method: "account/updated", params: { ignored: true } });
    send({ id: 9000, result: { ignored: true } });
    return send({
      id: message.id,
      result: {
        serverPid: process.pid,
        rateLimits: {
          primary:
            scenario === "no-limits"
              ? null
              : {
                  usedPercent: 29,
                  windowDurationMins: 300,
                  resetsAt: scenario === "expired" ? Math.floor(Date.now() / 1000) - 10 : 1900000000,
                },
          secondary:
            scenario === "no-limits" ? null : { usedPercent: 56, windowDurationMins: 10080, resetsAt: 1900500000 },
        },
      },
    });
  }
  // The usage extension must never start model turns or request credential changes.
  process.exit(4);
});
