import { Action, ActionPanel, Detail, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAuth, AuthGate, streamChat, Message } from "./shared";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

export default function AnalyzeScreenshot(props: {
  arguments: { prompt: string };
}) {
  const [markdown, setMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { ghoToken, deviceFlow } = useAuth();

  useEffect(() => {
    if (!ghoToken) return;

    let cancelled = false;
    const controller = new AbortController();

    const processScreenshot = async () => {
      let tempFile = "";
      try {
        tempFile = join(
          environment.supportPath,
          `screenshot-${Date.now()}.png`,
        );

        // Take screenshot without playing sound
        await execAsync(`/usr/sbin/screencapture -x "${tempFile}"`);

        // Read file contents
        const imageBuffer = await readFile(tempFile);
        const base64Image = imageBuffer.toString("base64");

        // Clean up immediately
        try {
          await unlink(tempFile);
        } catch (e) {
          /* ignore */
        }

        if (cancelled) return;

        const userPrompt = props.arguments.prompt;
        const content = [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64Image}` },
          },
        ] as Exclude<Message["content"], string>;

        const message: Message = {
          role: "user",
          content: content,
        };

        streamChat(
          ghoToken,
          [message],
          (contentChunk) => {
            if (!cancelled) setMarkdown(contentChunk);
          },
          () => {
            if (!cancelled) setIsLoading(false);
          },
          (error) => {
            if (!cancelled) {
              setMarkdown(
                `**Error**: ${error instanceof Error ? error.message : String(error)}`,
              );
              setIsLoading(false);
            }
          },
          controller.signal,
        );
      } catch (error) {
        if (!cancelled) {
          setMarkdown(
            `**Error**: ${error instanceof Error ? error.message : String(error)}`,
          );
          setIsLoading(false);
        }
        if (tempFile) {
          try {
            await unlink(tempFile);
          } catch (e) {
            /* ignore */
          }
        }
      }
    };

    processScreenshot();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ghoToken]);

  return (
    <AuthGate ghoToken={ghoToken} deviceFlow={deviceFlow}>
      <Detail
        isLoading={isLoading}
        markdown={
          markdown || (isLoading ? "📸 Taking screenshot and analyzing..." : "")
        }
        actions={
          <ActionPanel>
            {markdown && (
              <Action.CopyToClipboard title="Copy Result" content={markdown} />
            )}
          </ActionPanel>
        }
      />
    </AuthGate>
  );
}
