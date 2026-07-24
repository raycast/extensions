import { Detail, ActionPanel, Action, Icon, showToast, Toast, environment } from "@raycast/api";
import { useState, useRef, useEffect } from "react";
import { WordData } from "./api";
import { execFile, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

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
  const audioProcessRef = useRef<ChildProcess | null>(null);
  const downloadAbortControllerRef = useRef<AbortController | null>(null);
  const tempFilesRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      downloadAbortControllerRef.current?.abort();
      if (audioProcessRef.current) {
        audioProcessRef.current.kill();
      }
      // Clean up all temporary files
      tempFilesRef.current.forEach((file) => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch (e) {
            console.error("Cleanup error:", e);
          }
        }
      });
    };
  }, []);

  const playAudio = async (audioUrl: string, label: string) => {
    if (!audioUrl) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No audio available",
        message: `No audio file for ${label}`,
      });
      return;
    }

    // Stop any current playback or download
    downloadAbortControllerRef.current?.abort();
    if (audioProcessRef.current) {
      audioProcessRef.current.kill();
    }

    downloadAbortControllerRef.current = new AbortController();
    const signal = downloadAbortControllerRef.current.signal;

    setAudioLoading(audioUrl);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Playing pronunciation...",
    });

    let tempFilePath = "";

    try {
      // Download the audio file
      const response = await fetch(audioUrl, { signal });
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (signal.aborted) return;
      const buffer = Buffer.from(arrayBuffer);

      // Save to temporary file
      const tempDir = environment.supportPath;
      tempFilePath = path.join(tempDir, `pronunciation_${Date.now()}.mp3`);
      tempFilesRef.current.push(tempFilePath);
      fs.writeFileSync(tempFilePath, buffer);

      // Play audio using platform-specific command
      await new Promise<void>((resolve, reject) => {
        let binary = "";
        let args: string[] = [];

        switch (process.platform) {
          case "win32":
            binary = "powershell";
            // Use Media.SoundPlayer for simplicity, though MediaPlayer is better for MP3.
            // Note: SoundPlayer is synchronous with .PlaySync() which suits our Promise wrapper.
            args = [
              "-Command",
              "& { $player = New-Object Media.SoundPlayer $args[0]; $player.PlaySync() }",
              tempFilePath,
            ];
            break;
          case "darwin":
            binary = "afplay";
            args = [tempFilePath];
            break;
          default:
            binary = "ffplay";
            args = ["-nodisp", "-autoexit", tempFilePath];
            break;
        }

        const proc = execFile(binary, args, (error) => {
          if (error && !proc.killed) {
            reject(error);
          } else {
            resolve();
          }
        });
        audioProcessRef.current = proc;
      });

      if (signal.aborted) return;

      // Clean up
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        tempFilesRef.current = tempFilesRef.current.filter((f) => f !== tempFilePath);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Played pronunciation";
      setAudioLoading(null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Audio error:", error);
      if (!signal.aborted) {
        toast.style = Toast.Style.Failure;
        toast.title = "Audio error";
        toast.message = error instanceof Error ? error.message : "Unknown error";
        setAudioLoading(null);
      }
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
