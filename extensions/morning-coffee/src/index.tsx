import { LocalStorage, showHUD } from "@raycast/api";
import { shell } from "./utils";

export default async () => {
  const websites = await LocalStorage.getItem<string>("websites");

  if (websites) {
    const websitesToOpen = JSON.parse(websites).map((website: { url: string }) => website.url);
    if (websitesToOpen.length) {
      await shell(`open ${websitesToOpen.join(" ")}`);
    } else {
      await showHUD("Morning Coffee: You have not added any websites yet");
    }
  }
};
