import { Action, ActionPanel, Clipboard, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
// import tesseractOcr from "./ocr";
// import utils from "./utils";
// import takeScreenshot from "./screenshot";

async function doIt(): Promise<
  { type: "error"; message: string } | { type: "loading" } | { type: "success"; result: string }
> {
  const { file } = await Clipboard.read({});
  if (!file || !file.startsWith("file://"))
    return { type: "error", message: "No screenshot found on clipboard! Create one with CMD+Ctrl+Shift+4" };

  try {
    const preferences = getPreferenceValues<{ geminiApiKey: string }>();
    const googleClient = createGoogleGenerativeAI({
      apiKey: preferences.geminiApiKey,
    });

    const {
      object: { content },
    } = await generateObject({
      model: googleClient("gemini-2.0-flash-001"),
      maxTokens: 2000,
      schema: z.object({
        content: z.string(),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the text from this image. Output ONLY the image's text content into the 'content' property. preserve all newlines and formatting",
            },
            {
              type: "image",
              image: await fs.readFile(decodeURI(file.substring(7)), { encoding: "base64" }),
            },
          ],
        },
      ],
    });

    return { type: "success", result: content };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { type: "error", message: `Error processing image: ${errorMessage}` };
  }
}

export default function SmartOCR() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof doIt>>>({ type: "loading" });

  useEffect(() => {
    doIt().then((r) => setResult(r));
  }, []);

  if (result.type === "error") {
    return <Detail markdown={result.message} />;
  }

  if (result.type === "loading") {
    return <Detail markdown={`Loading...`} />;
  }
  return (
    <Detail
      markdown={`\`\`\`\n${result.result}\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" content={result.result} />
        </ActionPanel>
      }
    />
  );
}
