import { Detail, ActionPanel, Action, AI, showToast, Toast, getPreferenceValues, environment } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { spawn, ChildProcess } from "child_process";
import { readFile, writeFile, unlink, access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { addHistoryEntry, getActiveMode, PromptMode } from "./history-storage";

type Stage = "recording" | "transcribing" | "processing" | "done" | "error";

const PROMPT_LABELS: Record<PromptMode, string> = {
  general: "General",
  email: "Email",
  slack: "Slack / Chat",
  notes: "Notes",
  custom: "Custom",
};

// Braille: each character is 2 columns × 4 rows of dots
// 160 time slices → 80 chars wide, mirrored: 12 dot rows per half → 3+3 char rows
const WAVEFORM_WIDTH = 160;
const HALF_DOT_ROWS = 12;
const HALF_CHAR_ROWS = HALF_DOT_ROWS / 4; // 3

// Braille dot bit values indexed by [column][row] within a character
// Left col: dots 1,2,3,7  |  Right col: dots 4,5,6,8
const BRAILLE_DOTS = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
];

function flipBrailleChar(ch: string): string {
  const code = ch.charCodeAt(0) - 0x2800;
  let f = 0;
  // Swap row 0↔3 and row 1↔2 for each column
  if (code & 0x01) f |= 0x40;
  if (code & 0x40) f |= 0x01;
  if (code & 0x02) f |= 0x04;
  if (code & 0x04) f |= 0x02;
  if (code & 0x08) f |= 0x80;
  if (code & 0x80) f |= 0x08;
  if (code & 0x10) f |= 0x20;
  if (code & 0x20) f |= 0x10;
  return String.fromCharCode(0x2800 + f);
}

function renderRecordingBlock(levels: number[], modeLabel: string): string {
  const values =
    levels.length < WAVEFORM_WIDTH
      ? Array(WAVEFORM_WIDTH - levels.length)
          .fill(0)
          .concat(levels)
      : levels.slice(-WAVEFORM_WIDTH);

  const barHeights = values.map((lvl) => Math.round(Math.min(Math.sqrt(lvl) * 3, 1) * HALF_DOT_ROWS));

  const charCols = WAVEFORM_WIDTH / 2; // 80
  const FADE_CHARS = 6;

  // Build bottom half (bars growing downward from center)
  const bottomRows: string[] = [];
  for (let cr = 0; cr < HALF_CHAR_ROWS; cr++) {
    let line = "";
    for (let cc = 0; cc < charCols; cc++) {
      let bits = 0;
      for (let lc = 0; lc < 2; lc++) {
        const barH = barHeights[cc * 2 + lc];
        for (let lr = 0; lr < 4; lr++) {
          const dotFromCenter = cr * 4 + lr;
          if (barH > dotFromCenter) bits |= BRAILLE_DOTS[lc][lr];
        }
      }
      // Fade: progressively remove dots near right edge
      const distFromRight = charCols - 1 - cc;
      if (distFromRight < FADE_CHARS && bits !== 0) {
        // Remove dots progressively based on position
        for (let b = 0; b < 8; b++) {
          if (bits & (1 << b) && (b + cr * 3) % FADE_CHARS >= distFromRight) {
            bits &= ~(1 << b);
          }
        }
        // Force blank at the very edge
        if (distFromRight === 0) bits = 0;
      }
      line += String.fromCharCode(0x2800 + bits);
    }
    bottomRows.push(line);
  }

  // Mirror: flip each character vertically, reverse row order
  const topRows = bottomRows.map((row) => [...row].map(flipBrailleChar).join("")).reverse();

  const waveRows = [...topRows, ...bottomRows];

  const line1 = "Press Enter to stop and transcribe,  Esc to cancel";
  const line2 = `Mode: ${modeLabel} (change in extension settings)`;

  return "# Recording\n\n```\n" + line1 + "\n\n" + waveRows.join("\n") + "\n\n" + line2 + "\n```";
}

function getCleanupPrompt(mode: PromptMode, customPrompt: string, transcription: string): string {
  const suffix = `Return ONLY the cleaned text with no explanations or commentary.\n\nTranscription:\n${transcription}`;

  switch (mode) {
    case "email":
      return `Format this speech transcription as a professional email. Include a subject line, appropriate greeting, well-structured body, and sign-off. Fix grammar, punctuation, and tone. ${suffix}`;
    case "slack":
      return `Clean up this speech transcription for a Slack message. Keep it casual and concise. Use short sentences, minimal formatting. Fix grammar but preserve a conversational tone. ${suffix}`;
    case "notes":
      return `Structure this speech transcription as clean notes with bullet points. Group related ideas together. Fix grammar and remove filler words. ${suffix}`;
    case "custom":
      return `${customPrompt || "Clean up this speech transcription."}\n\n${suffix}`;
    default:
      return `Clean up this speech transcription. Fix grammar, punctuation, and capitalization. Remove filler words (um, uh, like, you know). Format into proper sentences and paragraphs. ${suffix}`;
  }
}

export default function SpeechToText() {
  const [stage, setStage] = useState<Stage>("recording");
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [rawTranscription, setRawTranscription] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentMode, setCurrentMode] = useState<PromptMode>("general");

  const processRef = useRef<ChildProcess | null>(null);
  const stageRef = useRef<Stage>("recording");
  const wavPath = useRef(join(tmpdir(), `raycast-stt-${Date.now()}.wav`));
  const stopSignalPath = useRef(join(tmpdir(), `raycast-stt-stop-${Date.now()}`));
  const stdoutBuffer = useRef("");
  const isTranscribing = useRef(false);

  stageRef.current = stage;

  const handleStdout = useCallback((data: Buffer) => {
    stdoutBuffer.current += data.toString();
    const lines = stdoutBuffer.current.split("\n");
    stdoutBuffer.current = lines.pop() || "";

    const newLevels: number[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("LEVEL:")) {
        const val = parseFloat(trimmed.slice(6));
        if (!isNaN(val)) newLevels.push(val);
      }
    }

    if (newLevels.length > 0) {
      setAudioLevels((prev) => [...prev, ...newLevels].slice(-WAVEFORM_WIDTH));
    }
  }, []);

  function doStartRecording() {
    const ts = Date.now();
    wavPath.current = join(tmpdir(), `raycast-stt-${ts}.wav`);
    stopSignalPath.current = join(tmpdir(), `raycast-stt-stop-${ts}`);

    const scriptPath = join(environment.assetsPath, "record.ps1");

    const ps = spawn("powershell.exe", [
      "-ExecutionPolicy",
      "Bypass",
      "-NoProfile",
      "-File",
      scriptPath,
      "-OutputPath",
      wavPath.current,
      "-StopSignalPath",
      stopSignalPath.current,
    ]);

    processRef.current = ps;

    ps.stdout.on("data", handleStdout);

    ps.stderr.on("data", (data: Buffer) => {
      console.error("Recording error:", data.toString());
    });

    ps.on("close", (code) => {
      if (code != null && code !== 0 && stageRef.current === "recording") {
        setErrorMessage(`Recording failed (code ${code}). Check microphone access.`);
        setStage("error");
      }
    });
  }

  useEffect(() => {
    doStartRecording();
    // Load active mode from storage (overrides preference)
    const { promptMode } = getPreferenceValues<Preferences>();
    getActiveMode()
      .then((stored) => {
        setCurrentMode(stored || promptMode || "general");
      })
      .catch(() => {
        /* use default */
      });
    return () => {
      if (processRef.current && !processRef.current.killed) {
        processRef.current.kill("SIGTERM");
        processRef.current = null;
      }
      cleanup();
    };
  }, []);

  async function cleanup() {
    try {
      await unlink(wavPath.current);
    } catch {
      /* ignore */
    }
    try {
      await unlink(stopSignalPath.current);
    } catch {
      /* ignore */
    }
    try {
      await unlink(`${wavPath.current}.recording`);
    } catch {
      /* ignore */
    }
  }

  async function stopAndTranscribe() {
    if (isTranscribing.current) return;
    isTranscribing.current = true;
    setStage("transcribing");

    try {
      await writeFile(stopSignalPath.current, "stop");
      await waitForFile(wavPath.current, 10000);
      await sleep(300);

      const wavBuffer = await readFile(wavPath.current);
      await cleanup();

      if (wavBuffer.length < 1000) {
        throw new Error("Recording too short. Please speak for at least a second.");
      }

      // Whisper API has a 25MB file size limit
      if (wavBuffer.length > 24 * 1024 * 1024) {
        throw new Error("Recording too long (exceeds 24MB). Please keep recordings under ~12 minutes.");
      }

      const { openaiApiKey: apiKey } = getPreferenceValues<Preferences>();
      if (!apiKey || !apiKey.trim()) {
        throw new Error("OpenAI API key is not set. Please configure it in extension preferences.");
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Transcribing...",
      });
      const transcription = await transcribeWithWhisper(wavBuffer);

      if (!transcription.trim()) {
        throw new Error("No speech detected. Please try again.");
      }

      setRawTranscription(transcription);
      setStage("processing");

      await showToast({
        style: Toast.Style.Animated,
        title: "Cleaning up with AI...",
      });
      const { customPrompt } = getPreferenceValues<Preferences>();
      const { text: cleaned, wasRaw } = await processWithAI(transcription, currentMode, customPrompt || "");
      setCleanedText(cleaned);
      setStage("done");
      // Save to history
      await addHistoryEntry({
        rawTranscription: transcription,
        cleanedText: cleaned,
        mode: currentMode,
      });
      // Copy via PowerShell to avoid Raycast's Clipboard API closing the window
      await copyToClipboard(cleaned);
      if (wasRaw) {
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to clipboard",
          message: "AI cleanup unavailable, raw transcription used",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to clipboard!",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setStage("error");
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  async function handleRecordAgain() {
    if (processRef.current && !processRef.current.killed) {
      processRef.current.kill("SIGTERM");
      processRef.current = null;
    }
    await cleanup();
    isTranscribing.current = false;
    setRawTranscription("");
    setCleanedText("");
    setErrorMessage("");
    setAudioLevels([]);
    stdoutBuffer.current = "";
    setStage("recording");
    doStartRecording();
  }

  // --- Render ---

  const modeLabel = PROMPT_LABELS[currentMode];

  if (stage === "recording") {
    return (
      <Detail
        isLoading={true}
        markdown={renderRecordingBlock(audioLevels, modeLabel)}
        actions={
          <ActionPanel>
            <Action title="Stop Recording" onAction={stopAndTranscribe} />
          </ActionPanel>
        }
      />
    );
  }

  if (stage === "transcribing") {
    return <Detail isLoading={true} markdown={["# Transcribing\n", "Converting your speech to text..."].join("\n")} />;
  }

  if (stage === "processing") {
    return (
      <Detail
        isLoading={true}
        markdown={[
          "# Processing\n",
          `Cleaning up with AI...\n`,
          "---\n",
          "**Raw transcription:**\n",
          `> ${rawTranscription}`,
        ].join("\n")}
      />
    );
  }

  if (stage === "error") {
    return (
      <Detail
        markdown={["# Error\n", `${errorMessage}\n`, "---\n", "Press **Enter** to try again."].join("\n")}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={handleRecordAgain} />
          </ActionPanel>
        }
      />
    );
  }

  // stage === "done"
  return (
    <Detail
      markdown={[`# Result\n`, "---\n", cleanedText].join("\n")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" content={cleanedText} />
          <Action.Paste title="Paste to Active App" content={cleanedText} />
          <Action title="Record Again" onAction={handleRecordAgain} />
        </ActionPanel>
      }
    />
  );
}

// --- Helpers ---

async function transcribeWithWhisper(wavBuffer: Buffer): Promise<string> {
  const { openaiApiKey, language, transcriptionModel } = getPreferenceValues<Preferences>();
  const model = transcriptionModel || "gpt-4o-mini-transcribe";

  const boundary = `----FormBoundary${Date.now()}`;
  const parts: Buffer[] = [];

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="recording.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
    ),
  );
  parts.push(wavBuffer);
  parts.push(Buffer.from("\r\n"));

  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`));

  if (language) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n`));
  }

  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext\r\n`));

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("Transcription request timed out. Please try a shorter recording.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error (${response.status}): ${errorText}`);
  }

  return (await response.text()).trim();
}

async function processWithAI(
  transcription: string,
  mode: PromptMode,
  customPrompt: string,
): Promise<{ text: string; wasRaw: boolean }> {
  const prompt = getCleanupPrompt(mode, customPrompt, transcription);

  // Try Raycast AI first (available for Pro subscribers)
  try {
    const result = await AI.ask(prompt, { creativity: "low" });
    return { text: result.trim(), wasRaw: false };
  } catch {
    // Raycast AI unavailable — fall back to OpenAI
  }

  // Fall back to OpenAI Chat Completions (gpt-4.1-nano)
  try {
    const { openaiApiKey } = getPreferenceValues<Preferences>();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new Error("AI cleanup timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const result = json.choices?.[0]?.message?.content?.trim();
    if (!result) throw new Error("Empty response");
    return { text: result, wasRaw: false };
  } catch {
    // Both failed — return raw transcription
    return { text: transcription, wasRaw: true };
  }
}

async function waitForFile(filePath: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await access(filePath);
      return;
    } catch {
      await sleep(300);
    }
  }
  throw new Error("Timed out waiting for recording to save.");
}

// Use PowerShell's Set-Clipboard on Windows rather than Raycast's `Clipboard.copy()` API.
// Rationale: invoking Raycast's clipboard API here (while the extension is finishing
// its UI flow) can cause the Raycast window to lose focus or close on Windows.
// Using an external Set-Clipboard call avoids that behavior and keeps the UI open.
function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve) => {
    const clipProc = spawn("powershell.exe", ["-NoProfile", "-Command", "$input | Set-Clipboard"]);
    clipProc.stdin.end(text);
    clipProc.on("close", (code) => {
      if (code !== 0) {
        console.error(`Set-Clipboard failed with code ${code}`);
      }
      resolve();
    });
    clipProc.on("error", (err) => {
      console.error("Clipboard error:", err);
      resolve();
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
