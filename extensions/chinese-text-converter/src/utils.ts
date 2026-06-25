import { getSelectedText, showToast, Toast } from "@raycast/api"
import { preferences } from "./preferences"

export async function getValidatedSelectedText(): Promise<string | null> {
  const text = await getSelectedText()

  if (preferences.strictMode && (text.endsWith("\n") || text.endsWith("\r\n"))) {
    await showToast({ style: Toast.Style.Failure, title: "No text selected" })
    console.error("Interrupted due to a possible fallback (Whole line copied).")
    return null
  }

  if (text.trim() === "") {
    await showToast({ style: Toast.Style.Failure, title: "No text selected" })
    return null
  }

  return text
}

export async function handleError(error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title: error instanceof Error ? error.message : "An unhandled error occurred",
    message: String(error),
  })
  console.error(error)
}

/**
 * Auto-detect direction: convert to simplified if the original text contains traditional characters; otherwise, convert to traditional
 */
export function autoDetectConvert(
  text: string,
  toSimplified: (s: string) => string,
  toTraditional: (s: string) => string,
): string {
  const simplified = toSimplified(text)
  return simplified !== text ? simplified : toTraditional(text)
}
