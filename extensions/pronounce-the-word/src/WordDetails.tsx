import { Detail, ActionPanel, Action, Icon, showToast, Toast, environment } from "@raycast/api";
import { useState } from "react";
import { WordData } from "./api";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

function getPlayCommand(filePath: string): string {
  switch (process.platform) {
    case "win32":
      return `powershell -c (New-Object Media.SoundPlayer "${filePath}").PlaySync()`;
    case "darwin":
      return `afplay "${filePath}"`;
    default:
      return `ffplay -nodisp -autoexit "${filePath}" 2>/dev/null || mpv --no-video "${filePath}" 2>/dev/null`;
  }
}

const modKey = process.platform === "win32" ? "Ctrl" : "⌘";
const shortcutModifier = process.platform === "win32" ? "ctrl" : "cmd";

function sortPhonetics(phonetics: WordData["phonetics"]): WordData["phonetics"] {
  const order: Record<string, number> = { US: 0, UK: 1 };
  return [...phonetics].sort((a, b) => (order[a.accent ?? ""] ?? 2) - (order[b.accent ?? ""] ?? 2));
}

interface WordDetailsProps {
  wordData: WordData;
  onBack: () => void;
}

export function WordDetails({ wordData, onBack }: WordDetailsProps) {
  const [audioLoading, setAudioLoading] = useState<string | null>(null);

  const playAudio = async (audioUrl: string, label: string) => {
    if (!audioUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No audio available",
        message: `No audio file for ${label}`,
      });
      return;
    }

    setAudioLoading(audioUrl);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Playing pronunciation...",
    });

    try {
      // Download the audio file
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to temporary file
      const tempDir = environment.supportPath;
      const tempFilePath = path.join(tempDir, `pronunciation_${Date.now()}.mp3`);
      fs.writeFileSync(tempFilePath, buffer);

      // Play audio using platform-specific command
      const playCommand = getPlayCommand(tempFilePath);
      await execAsync(playCommand);

      // Clean up
      fs.unlinkSync(tempFilePath);

      toast.style = Toast.Style.Success;
      toast.title = "Played pronunciation";
      setAudioLoading(null);
    } catch (error) {
      console.error("Audio error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Audio error";
      toast.message = error instanceof Error ? error.message : "Unknown error";
      setAudioLoading(null);
    }
  };

  const markdown = generateMarkdown(wordData);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Pronunciation: ${wordData.word}`}
      actions={
        <ActionPanel>
          {sortPhonetics(wordData.phonetics)
            .filter((p) => p.audio)
            .map((phonetic, index) => {
              const label = phonetic.accent || `Pronunciation ${index + 1}`;
              const isLoading = audioLoading === phonetic.audio;

              // Map index to valid keyboard key
              const keyMap = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
              const shortcutKey = index < keyMap.length ? keyMap[index] : undefined;

              return (
                <Action
                  key={index}
                  title={isLoading ? `Playing ${label}...` : `Play: ${label}`}
                  icon={Icon.Speaker}
                  onAction={() => playAudio(phonetic.audio, label)}
                  {...(shortcutKey && { shortcut: { modifiers: [shortcutModifier], key: shortcutKey } })}
                />
              );
            })}
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
        </ActionPanel>
      }
    />
  );
}

function generateMarkdown(wordData: WordData): string {
  let markdown = `# ${wordData.word}\n\n`;

  // Audio shortcuts section at the top
  const audioPhonetics = sortPhonetics(wordData.phonetics).filter((p) => p.audio);
  if (audioPhonetics.length > 0) {
    markdown += `> 🔊 **Quick Play:** `;
    audioPhonetics.forEach((phonetic, index) => {
      if (index > 0) markdown += " • ";
      const accent = phonetic.accent || `${index + 1}`;
      markdown += `${modKey}${index + 1} (${accent})`;
    });
    markdown += `\n\n`;
  }

  // Phonetics section
  if (wordData.phonetics.length > 0) {
    markdown += `## Pronunciation\n\n`;

    wordData.phonetics.forEach((phonetic) => {
      if (phonetic.text) {
        markdown += `**${phonetic.text}**`;
        if (phonetic.accent) {
          markdown += ` *(${phonetic.accent})*`;
        }
        markdown += `\n\n`;
      }
    });
  }

  // Meanings section
  if (wordData.meanings.length > 0) {
    markdown += `## Meanings\n\n`;

    wordData.meanings.forEach((meaning) => {
      markdown += `### ${meaning.partOfSpeech}\n\n`;

      meaning.definitions.forEach((def, defIndex) => {
        markdown += `${defIndex + 1}. ${def.definition}\n\n`;

        if (def.example) {
          markdown += `   *Example:* "${def.example}"\n\n`;
        }

        if (def.synonyms && def.synonyms.length > 0) {
          markdown += `   **Synonyms:** ${def.synonyms.join(", ")}\n\n`;
        }

        if (def.antonyms && def.antonyms.length > 0) {
          markdown += `   **Antonyms:** ${def.antonyms.join(", ")}\n\n`;
        }
      });
    });
  }

  return markdown;
}
