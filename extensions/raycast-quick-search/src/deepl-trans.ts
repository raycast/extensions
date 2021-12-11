import { showHUD } from "@raycast/api";
import { DeeplOpner } from "./utils/opener";
import { readtext } from "./utils/readtxt"

export default async () => {
  try {
    const text = await readtext()
    await DeeplOpner(text)
    showHUD("🎉 Open deepl search")
  } catch (error) {
    showHUD("💩 Sorry, Can not open deepl for now!")
  }
}
