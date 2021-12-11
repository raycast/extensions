import { showHUD } from "@raycast/api";
import { GithubRepoOpner } from "./utils/opener";
import { readtext } from "./utils/readtxt"

export default async () => {
  try {
    const text = await readtext()
    await GithubRepoOpner(text)
    showHUD("🎉 Open github search")
  } catch (error) {
    showHUD("💩 Sorry, Can not open github for now!")
  }
}
