import { Clipboard } from "@raycast/api"
import OpenCC from "opencc-js"
import { getValidatedSelectedText, handleError } from "./utils"

export default async function main() {
  try {
    const selectedText = await getValidatedSelectedText()

    if (!selectedText) return

    const toSimplified = OpenCC.Converter({ from: "t", to: "cn" })
    const result = toSimplified(selectedText)

    await Clipboard.paste(result)
  } catch (error) {
    await handleError(error)
  }
}
