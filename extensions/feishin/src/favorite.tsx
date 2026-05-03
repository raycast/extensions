import { showHUD } from "@raycast/api";
import { createConnection } from "./feishin";

export default async function Command() {
  await new Promise<void>((resolve, reject) => {
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
          const song = event.data.song;
          if (!song) {
            done = true;
            clearTimeout(timer);
            conn.close();
            resolve();
            showHUD("Nothing is playing");
            return;
          }
          conn.send({
            event: "favorite",
            id: song.id,
            favorite: !song.userFavorite,
          });
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
    .then(() => showHUD("Toggled Favorite"))
    .catch((err) => showHUD(`Failed: ${(err as Error).message}`));
}
