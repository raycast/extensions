import fs from "fs";
import { loadTunnels, LOG_DIR, ensureDirs } from "./lib/store";
import { reconnectTunnels } from "./lib/reconnect";

function appendBackgroundLog(message: string): void {
  ensureDirs();
  fs.appendFileSync(
    `${LOG_DIR}/background-reconnect.log`,
    `${new Date().toISOString()} ${message}\n`,
  );
}

export default async function BackgroundReconnect() {
  const result = await reconnectTunnels(loadTunnels());

  if (result.started.length > 0) {
    appendBackgroundLog(`started ${result.started.join(", ")}`);
  }

  for (const failure of result.failed) {
    appendBackgroundLog(
      `failed ${failure.name} (${failure.id}): ${failure.error}`,
    );
  }
}
