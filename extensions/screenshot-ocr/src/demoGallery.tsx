import { Action, ActionPanel, Detail, Icon, List, LocalStorage, environment, showHUD } from "@raycast/api"
import { useMemo, useState } from "react"
import fs from "fs"
import path from "path"
import { OcrSpaceProvider } from "./ocr"
import { TesseractProvider } from "./ocr-tesseract"
import { getPreferenceValues } from "@raycast/api"
import type { ExtensionPreferences } from "./types"

/** OCR result interface */
interface OCRResult {
  text: string
  lang?: string
  conf?: number
  ms?: number
}

/** Run OCR on a demo asset file */
async function runOCROnAsset(relativeAssetPath: string): Promise<OCRResult> {
  const start = Date.now()
  const prefs = getPreferenceValues<ExtensionPreferences>()
  const language = prefs.ocrLanguage || "eng"

  try {
    // Construct absolute path to the asset
    const assetPath = path.join(environment.assetsPath, relativeAssetPath)

    // Verify file exists
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Demo asset not found: ${relativeAssetPath}`)
    }

    // Initialize OCR provider
    const provider =
      prefs.ocrProvider === "tesseract" ? new TesseractProvider() : new OcrSpaceProvider(prefs.ocrSpaceApiKey)

    // Run OCR
    const result = await provider.recognize(assetPath, language)
    const ms = Date.now() - start

    return {
      text: result.text,
      lang: language,
      ms,
      conf: result.confidence,
    }
  } catch (error) {
    const ms = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : "Unknown OCR error"

    console.error("OCR failed:", error)

    return {
      text: `OCR Error: ${errorMessage}`,
      lang: language,
      ms,
      conf: 0,
    }
  }
}

/** Demo scenario interface */
interface DemoScenario {
  id: string
  title: string
  description: string
  img: string
  mode: "paragraph" | "code" | "table"
  tags: string[]
  staticResult: string
}

/** Professional demo scenarios for store screenshots */
const SCENES: DemoScenario[] = [
  {
    id: "a",
    title: "Copy Unselectable Web Text",
    description:
      "Perfect for copying text from websites that disable text selection or use canvas rendering. Ideal for documentation, tutorials, and protected content.",
    img: "demo/hero-web-unselectable.png",
    mode: "paragraph",
    tags: ["Web", "Canvas", "Protected"],
    staticResult: `Canvas text @ 16px — crisp but small.
Canvas text @ 22px — medium contrast.
Canvas text @ 30px — symbols: { } [ ] ( ) / \\ ~ ^ \`
Longer run @ 20px — hyphenation check: hy-

This demonstrates unselectable web text that normal copy-paste cannot access. Perfect for documentation, tutorials, and protected articles where text selection is disabled.`,
  },
  {
    id: "b",
    title: "Extract Code from Chat Apps",
    description:
      "Extract text from chat applications, code blocks, and technical discussions. Preserves formatting and handles mixed content beautifully.",
    img: "demo/hero-chat-apps.png",
    mode: "code",
    tags: ["Chat", "Code", "Dev"],
    staticResult: `Morgan 10:24 PM
Heads up: build failed with EADDRINUSE on port 3000.

EADDRINUSE: Address already in use
lsof -i :3000 | awk 'NR>1 {print $2}' | xargs kill -9

Perfect for extracting code from chat applications like Slack, Discord, or Microsoft Teams. Preserves formatting and indentation for easy copy-paste into your development environment.`,
  },
  {
    id: "c",
    title: "Capture Video Subtitles",
    description:
      "Capture captions, subtitles, and text overlays from videos. Works with semi-transparent backgrounds and busy video content.",
    img: "demo/hero-video-subtitles.png",
    mode: "paragraph",
    tags: ["Video", "Captions", "Overlay"],
    staticResult: `When text is baked into video, just capture → paste.

Great for:
• Educational videos and tutorials
• Recorded presentations and webinars
• Screen recordings with text overlays
• Video content with embedded captions

Works with semi-transparent backgrounds and busy video content.`,
  },
  {
    id: "d",
    title: "Convert Tables to Spreadsheets",
    description:
      "Extract structured data from tables, invoices, and spreadsheets. Automatically formats as tab-separated values for easy import.",
    img: "demo/hero-table.png",
    mode: "table",
    tags: ["Tables", "Data", "TSV"],
    staticResult: `Name	Qty	Unit Price	Total	Status	ID
Widget A	2	$9.99	$19.98	Paid	INV-18452
Widget B	1	$4.99	$4.99	Pending	INV-18453
Cable C	3	$2.50	$7.50	Shipped	INV-18454
Bracket D	1	$15.00	$15.00	Paid	INV-18455

Automatically converts to TSV format for easy import into Excel, Google Sheets, or any spreadsheet application.`,
  },
  {
    id: "e",
    title: "Copy Text from Desktop UI",
    description:
      "Capture text baked into desktop UI where copy isn't available. Great for error dialogs, settings panels, and status bars across macOS apps.",
    img: "demo/hero-desktop-ui.png",
    mode: "paragraph",
    tags: ["Desktop", "System", "UI"],
    staticResult: `Preferences — Network
Proxy: Manual
Host: proxy.internal.local
Port: 8080

Update Available
Version 2.1.4 is ready to install. Release notes include performance improvements and bug fixes.

Error: Unable to connect to server.
Please check your internet connection and try again.`,
  },
  {
    id: "f",
    title: "Digitize Receipts & Invoices",
    description:
      "Process receipts, invoices, and documents at any angle. Handles thermal printer text, low contrast, and rotated content.",
    img: "demo/hero-receipt-photos.png",
    mode: "paragraph",
    tags: ["Receipts", "Documents", "Rotated"],
    staticResult: `ACME MARKET
123 Main Street, Anytown, USA
Phone: (555) 123-4567

Date: 2025-09-27 10:24
Cashier: Sarah Johnson
Transaction: #001234

Item            Qty     Total
Widget-A         2      $19.98
Cable-C          1       $4.59
Bracket-D        1      $12.99
Tax                       $3.00
--------------------------------
TOTAL                   $40.56

Thank you for your business!
Receipt #: RCP-2025-0927-001234

Works with rotated, faded, or thermal-printed receipts.`,
  },
] as const

export default function DemoGallery() {
  const [q, setQ] = useState("")
  const items = useMemo(
    () =>
      SCENES.filter(
        (s) =>
          s.title.toLowerCase().includes(q.toLowerCase()) ||
          s.description.toLowerCase().includes(q.toLowerCase()) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q.toLowerCase()))
      ),
    [q]
  )

  return (
    <List
      searchBarPlaceholder="Search demo scenarios…"
      onSearchTextChange={setQ}
      searchText={q}
      throttle
      filtering={{ keepSectionOrder: true }}
    >
      <List.Section title="Screenshot OCR — Demo Gallery" subtitle={`${items.length} scenarios available`}>
        {items.map((s) => (
          <List.Item
            key={s.id}
            title={s.title}
            subtitle={s.description}
            icon={Icon.Image}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Demo Scenario"
                  icon={Icon.AppWindowSidebarLeft}
                  target={<DemoDetail sceneId={s.id} />}
                />
                <Action.OpenInBrowser
                  title="View Store Guidelines"
                  url="https://developers.raycast.com/basics/prepare-an-extension-for-store"
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}

function DemoDetail({ sceneId }: { sceneId: (typeof SCENES)[number]["id"] }) {
  const scene = SCENES.find((s) => s.id === sceneId)!
  const [result, setResult] = useState<OCRResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Professional layout for store screenshots
  const img = `![${scene.title}](${scene.img}?raycast-width=800)`

  const resultText = result?.text ?? scene.staticResult ?? "(Run OCR to preview the text here)"
  const lang = result?.lang ?? "Auto-detected"
  const conf = typeof result?.conf === "number" ? `${Math.round(result!.conf! * 100)}%` : "—"
  const ms = result?.ms ?? 800

  const markdown = [
    `# ${scene.title}`,
    "",
    scene.description,
    "",
    "---",
    "",
    img,
    "",
    "## 📋 Extracted Text",
    "",
    "```",
    resultText,
    "```",
    "",
    "## ⚡ Performance",
    `- **Language:** ${lang}`,
    `- **Processing Time:** ${ms}ms`,
    `- **Confidence:** ${conf}`,
    `- **Output Format:** ${scene.mode}`,
    "",
    "## 💡 Usage Tips",
    scene.mode === "table"
      ? "- Use **Copy as TSV** to import data into Excel or Google Sheets"
      : scene.mode === "code"
        ? "- Code formatting is preserved for easy copy-paste into editors"
        : "- Text is cleaned and formatted for optimal readability",
    "- Results are automatically saved to clipboard",
    "- Use ⌘V to paste into any application",
    "",
    "---",
    "",
    `**Tags:** ${scene.tags.map((tag) => `\`${tag}\``).join(" ")}`,
    "",
  ].join("\n")

  const handleRunOCR = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const ocrResult = await runOCROnAsset(scene.img)
      setResult(ocrResult)

      // Save to localStorage for Last OCR Result command
      await LocalStorage.setItem("last_ocr_text", ocrResult.text)
      await LocalStorage.setItem(
        "last_ocr_meta",
        JSON.stringify({
          lang: ocrResult.lang,
          conf: ocrResult.conf,
          ms: ocrResult.ms,
        })
      )

      // Show success feedback
      await showHUD(`✅ OCR completed in ${ocrResult.ms}ms`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
      console.error("OCR execution failed:", err)
      await showHUD(`❌ OCR failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={scene.title}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Run Ocr Analysis"
            icon={Icon.Play}
            onAction={handleRunOCR}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />

          {result?.text && (
            <>
              <Action.CopyToClipboard
                title="Copy Extracted Text"
                content={result.text}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />

              {scene.mode === "table" && (
                <Action.CopyToClipboard
                  title="Copy as Tsv Format"
                  content={result.text.replace(/[ ]{2,}/g, "\t")}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              )}
            </>
          )}

          <Action.OpenInBrowser
            title="View Store Guidelines"
            url="https://developers.raycast.com/basics/prepare-an-extension-for-store"
          />

          {error && <Action title={`Error: ${error}`} icon={Icon.ExclamationMark} onAction={() => setError(null)} />}
        </ActionPanel>
      }
    />
  )
}
