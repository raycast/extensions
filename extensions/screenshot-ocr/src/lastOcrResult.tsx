import { Action, ActionPanel, Detail, LocalStorage, Icon, showHUD } from "@raycast/api"
import { useEffect, useState } from "react"

interface OCRMetadata {
  lang?: string
  conf?: number
  ms?: number
}

export default function LastOCRResult() {
  const [text, setText] = useState<string>("(No OCR result yet)")
  const [meta, setMeta] = useState<OCRMetadata>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadLastResult = async () => {
      try {
        const lastText = await LocalStorage.getItem<string>("last_ocr_text")
        const lastMeta = await LocalStorage.getItem<string>("last_ocr_meta")

        setText(lastText || "(No OCR result yet)")

        if (lastMeta) {
          try {
            setMeta(JSON.parse(lastMeta))
          } catch (parseError) {
            console.error("Failed to parse OCR metadata:", parseError)
            setMeta({})
          }
        } else {
          setMeta({})
        }
      } catch (error) {
        console.error("Failed to load last OCR result:", error)
        setText("(Error loading last result)")
        setMeta({})
      } finally {
        setIsLoading(false)
      }
    }

    loadLastResult()
  }, [])

  const markdown = [
    "# 📋 Last OCR Result",
    "",
    "## Extracted Text",
    "```",
    text,
    "```",
    "",
    "## Performance Metrics",
    `- **Language:** ${meta.lang ?? "Auto-detected"}`,
    `- **Processing Time:** ${meta.ms ?? "—"}ms`,
    `- **Confidence:** ${meta.conf ? `${Math.round(meta.conf * 100)}%` : "—"}`,
    "",
    "---",
    "",
    "*This result was automatically saved from your last OCR operation.*",
    "",
  ].join("\n")

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Last OCR Result"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Text to Clipboard"
            content={text}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={async () => {
              try {
                await showHUD("📋 Text copied to clipboard")
              } catch (e) {
                console.error("Failed to show HUD:", e)
              }
            }}
          />

          <Action.OpenInBrowser
            title="Open Demo Gallery"
            url="raycast://extensions/adsights/screenshot-ocr/demoGallery"
          />
        </ActionPanel>
      }
    />
  )
}
