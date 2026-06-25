import { Clipboard } from "@raycast/api"
import OpenCC from "opencc-js"
import { autoDetectConvert, getValidatedSelectedText, handleError } from "./utils"

export default async function main() {
  try {
    const selectedText = await getValidatedSelectedText()

    if (!selectedText) return

    // Character-to-character converters (without phrase adaptation)
    const toSimplified = OpenCC.Converter({ from: "t", to: "cn" })
    const toTraditional = OpenCC.Converter({ from: "cn", to: "t" })
    const result = autoDetectConvert(selectedText, toSimplified, toTraditional)

    await Clipboard.paste(result)
  } catch (error) {
    handleError(error)
  }
}
