import { showHUD } from "@raycast/api";
import { GoogleSearchOpner } from "./utils/opener";
import { readtext } from "./utils/readtxt"

export default async () => {
  try {
    const text = await readtext()
    await GoogleSearchOpner(text)
    showHUD("🎉 Open google search")
  } catch (error) {
    showHUD("💩 Sorry, Can not open google search for now!")
  }
}
