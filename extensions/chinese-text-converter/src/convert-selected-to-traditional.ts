import { Clipboard } from "@raycast/api"
import OpenCC from "opencc-js"
import { getValidatedSelectedText, handleError } from "./utils"

export default async function main() {
  try {
    const selectedText = await getValidatedSelectedText()

    if (!selectedText) return

    const toTraditional = OpenCC.Converter({ from: "cn", to: "t" })
    const result = toTraditional(selectedText)

    await Clipboard.paste(result)
  } catch (error) {
    handleError(error)
  }
}
