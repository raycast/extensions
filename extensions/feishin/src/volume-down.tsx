import { showHUD } from "@raycast/api";
import { createConnection } from "./feishin";
import { SongState } from "./types";

export default async function Command() {
  await new Promise<void>((resolve, reject) => {
    let state: SongState = {};
    let done = false;

    const timer = setTimeout(() => {
      conn.close();
      reject(
        new Error(
          "Connection timed out. Is Feishin running with Remote Control enabled?",
        ),
      );
    }, 5000);

    const conn = createConnection(
      (event) => {
        if (done) return;
        if (event.event === "state") {
          state = event.data;
          const current = state.volume ?? 50;
          const next = Math.max(0, current - 10);
          conn.send({ event: "volume", volume: next });
          done = true;
          setTimeout(() => {
            clearTimeout(timer);
            conn.close();
            resolve();
          }, 300);
        }
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  })
    .then(() => showHUD("Volume Down"))
    .catch((err) => showHUD(`Failed: ${(err as Error).message}`));
}
