import { Clipboard } from "@raycast/api"
import OpenCC from "opencc-js"
import { autoDetectConvert, getValidatedSelectedText, handleError } from "./utils"

export default async function main() {
  try {
    const selectedText = await getValidatedSelectedText()

    if (!selectedText) return

    // Convert selected text between Simplified and Traditional Chinese with phrase adaptation
    const toSimplified = OpenCC.Converter({ from: "twp", to: "cn" })
    const toTraditional = OpenCC.Converter({ from: "cn", to: "twp" })
    const result = autoDetectConvert(selectedText, toSimplified, toTraditional)

    await Clipboard.paste(result)
  } catch (error) {
    handleError(error)
  }
}
