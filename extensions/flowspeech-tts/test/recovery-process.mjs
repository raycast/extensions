import { host, saveRecovery } from "./host-fixture.mjs";
import path from "node:path";

const [directory, storageFile, requestId] = process.argv.slice(2);
host.supportPath = path.join(directory, "audio");
host.storageFile = storageFile;
globalThis.fetch = async () => {
  throw new Error("Network forbidden");
};
process.once("message", async () => {
  try {
    await saveRecovery({ requestId, createdAt: new Date().toISOString(), state: "pending" });
    process.send({ saved: true });
  } catch (error) {
    process.send({ saved: false, error: error.message });
  } finally {
    process.disconnect();
  }
});
process.send({ ready: true });
