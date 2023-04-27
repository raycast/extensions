import fetch from "node-fetch";
import { Clipboard, showHUD } from "@raycast/api";
import { getCookie } from "./utils/seedr-utils";

const addMagentLink = async () => {
  const cookie = getCookie();
  const magnetLink = (await Clipboard.read()).text;
  if (magnetLink.startsWith("magnet") === false) {
    showHUD("❌ Error: Magnet link not found in clipboard");
    return;
  }

  const response = await fetch("https://www.seedr.cc/task", {
    method: "POST",
    headers: {
      authority: "www.seedr.cc",
      accept: "application/json",
      cookie: "RSESS_remember=" + cookie,
      referer: "https://www.seedr.cc/files",
    },
    body: new URLSearchParams({
      folder_id: "0",
      type: "torrent",
      torrent_magnet: magnetLink,
    }),
  });

  if (!response.ok) {
    showHUD(`Error: ${response.statusText}`);
    return;
  }

  showHUD("🧲 Torrent added");
};

export default addMagentLink;
