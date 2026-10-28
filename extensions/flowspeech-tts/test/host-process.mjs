import { host, selectedCommand, recoveryCommand, records, viewText } from "./host-fixture.mjs";
import path from "node:path";

const [mode, directory, storageFile] = process.argv.slice(2);
host.supportPath = path.join(directory, "audio");
host.storageFile = storageFile;
let requests = 0;
globalThis.fetch = async (_url, init) => {
  requests++;
  if (mode !== "generate") throw new Error("Recovery must not use the network");
  const record = records().find((value) => value.requestId === init.headers["Idempotency-Key"]);
  if (!record) throw new Error("Missing durable request ID before submission");
  process.send({ phase: "submitted", requestId: record.requestId });
  await new Promise(() => {});
};
if (mode === "generate") {
  setInterval(() => {}, 1000);
  await selectedCommand();
} else {
  await recoveryCommand();
  process.send({ phase: "recovered", message: viewText(host.recoveryView), requests });
  process.disconnect();
}
