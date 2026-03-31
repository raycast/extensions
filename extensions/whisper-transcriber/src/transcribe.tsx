import { Action, ActionPanel, Detail, Form, Toast, getPreferenceValues, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface FormValues {
  audioFile: string[];
}

interface TranscriptResult {
  text: string;
  txtPath?: string;
  model: string;
}

interface ExtensionPreferences {
  model: string;
  outputMode: "temp" | "source" | "custom";
  outputDirectory?: string;
  whisperPath?: string;
  ffmpegPath?: string;
}

export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const filePath = values.audioFile?.[0];

    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pick a media file first",
      });
      return;
    }

    push(<TranscriptView filePath={filePath} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose an audio or video file from your Mac and transcribe it locally with Whisper." />
      <Form.FilePicker
        id="audioFile"
        title="Media File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
      />
    </Form>
  );
}

function TranscriptView({ filePath }: { filePath: string }) {
  const [state, setState] = useState<{
    isLoading: boolean;
    markdown: string;
    plainText: string;
    txtPath?: string;
  }>({
    isLoading: true,
    markdown: `# Transcribing...\n\nFile: \`${escapeMd(filePath)}\``,
    plainText: "",
  });

  useEffect(() => {
    void runTranscription();
  }, []);

  async function runTranscription() {
    try {
      const result = await transcribeWithWhisperCli(filePath);

      setState({
        isLoading: false,
        markdown: [
          "# Transcript",
          "",
          `**File**: \`${escapeMd(filePath)}\``,
          `**Model**: \`${escapeMd(result.model)}\``,
          result.txtPath ? `**Saved TXT**: \`${escapeMd(result.txtPath)}\`` : "",
          "",
          result.text || "_No text returned._",
        ]
          .filter(Boolean)
          .join("\n"),
        plainText: result.text,
        txtPath: result.txtPath,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Transcript ready",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      setState({
        isLoading: false,
        markdown: `# Transcription Failed\n\n${escapeMd(message)}`,
        plainText: "",
      });

      await showToast({
        style: Toast.Style.Failure,
        title: "Transcription failed",
        message,
      });
    }
  }

  return (
    <Detail
      isLoading={state.isLoading}
      markdown={state.markdown}
      actions={
        <ActionPanel>
          {state.plainText && <Action.CopyToClipboard title="Copy Transcript" content={state.plainText} />}
          {state.txtPath && <Action.OpenWith path={state.txtPath} title="Open Transcript File" />}
          {state.txtPath && <Action.ShowInFinder path={state.txtPath} title="Show Transcript in Finder" />}
          <Action.ShowInFinder path={filePath} title="Show Source File in Finder" />
        </ActionPanel>
      }
    />
  );
}

async function transcribeWithWhisperCli(filePath: string): Promise<TranscriptResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error("That file does not exist anymore.");
  }

  const preferences = getExtensionPreferences();
  const outputDir = resolveOutputDirectory(filePath, preferences);
  const outputSnapshot = snapshotTranscriptFiles(outputDir);
  const baseName = path.basename(filePath, path.extname(filePath));
  const args = [filePath, "--model", preferences.model, "--output_format", "txt", "--output_dir", outputDir];

  const processOutput = await runProcess(resolveWhisperCommand(preferences), args, preferences);
  const dependencyError = extractDependencyError(processOutput);
  if (dependencyError) {
    throw new Error(dependencyError);
  }

  const txtPath = findTranscriptFile(outputDir, baseName, outputSnapshot);
  if (!txtPath) {
    const outputFiles = fs.readdirSync(outputDir);
    const details = [
      `Whisper finished, but no TXT file was created in \`${outputDir}\`.`,
      outputFiles.length > 0 ? `Files created: ${outputFiles.join(", ")}` : "No files were created.",
      processOutput.stderr ? `Whisper output: ${processOutput.stderr.trim()}` : "",
      processOutput.stdout ? `Whisper output: ${processOutput.stdout.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(details);
  }

  const text = fs.readFileSync(txtPath, "utf8").trim();
  return { text, txtPath, model: preferences.model };
}

function getExtensionPreferences(): ExtensionPreferences {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  return {
    model: preferences.model || "base",
    outputMode: preferences.outputMode || "temp",
    outputDirectory: normalizeOptionalPath(preferences.outputDirectory),
    whisperPath: normalizeOptionalPath(preferences.whisperPath),
    ffmpegPath: normalizeOptionalPath(preferences.ffmpegPath),
  };
}

function normalizeOptionalPath(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function resolveOutputDirectory(filePath: string, preferences: ExtensionPreferences) {
  if (preferences.outputMode === "source") {
    return path.dirname(filePath);
  }

  if (preferences.outputMode === "custom") {
    if (!preferences.outputDirectory) {
      throw new Error(
        "Set Custom Output Directory in Raycast preferences or switch Output Location to Temporary Folder.",
      );
    }

    if (!fs.existsSync(preferences.outputDirectory)) {
      throw new Error("The configured Custom Output Directory does not exist.");
    }

    return preferences.outputDirectory;
  }

  return fs.mkdtempSync(path.join(os.tmpdir(), "raycast-whisper-transcript-"));
}

function resolveWhisperCommand(preferences: ExtensionPreferences) {
  const candidates = [
    preferences.whisperPath,
    process.env.WHISPER_PATH,
    "/Library/Frameworks/Python.framework/Versions/3.14/bin/whisper",
    "/opt/homebrew/bin/whisper",
    "/usr/local/bin/whisper",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "whisper";
}

function resolveFfmpegCommand(preferences: ExtensionPreferences) {
  const candidates = [
    preferences.ffmpegPath,
    process.env.FFMPEG_PATH,
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "ffmpeg";
}

function snapshotTranscriptFiles(outputDir: string) {
  return new Map(
    fs
      .readdirSync(outputDir)
      .filter((fileName) => fileName.endsWith(".txt"))
      .map((fileName) => {
        const filePath = path.join(outputDir, fileName);
        return [filePath, fs.statSync(filePath).mtimeMs] as const;
      }),
  );
}

function findTranscriptFile(outputDir: string, baseName: string, outputSnapshot: Map<string, number>) {
  const txtFiles = fs
    .readdirSync(outputDir)
    .filter((fileName) => fileName.endsWith(".txt"))
    .map((fileName) => path.join(outputDir, fileName))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);

  const expectedPath = path.join(outputDir, `${baseName}.txt`);
  if (txtFiles.includes(expectedPath)) {
    const previousMtime = outputSnapshot.get(expectedPath) ?? 0;
    if (fs.statSync(expectedPath).mtimeMs > previousMtime) {
      return expectedPath;
    }
  }

  return txtFiles.find((filePath) => (outputSnapshot.get(filePath) ?? 0) < fs.statSync(filePath).mtimeMs);
}

function extractDependencyError(processOutput: { stdout: string; stderr: string }) {
  const combinedOutput = `${processOutput.stderr}\n${processOutput.stdout}`;

  if (combinedOutput.includes("No such file or directory: 'ffmpeg'")) {
    return "Whisper could not find ffmpeg from inside Raycast. Install ffmpeg or set the FFmpeg Path preference.";
  }

  return null;
}

function getBinaryDirectory(binaryPath: string) {
  if (!path.isAbsolute(binaryPath)) {
    return null;
  }

  return path.dirname(binaryPath);
}

function buildProcessEnv(preferences: ExtensionPreferences) {
  const ffmpegCommand = resolveFfmpegCommand(preferences);
  const extraPathEntries = [
    getBinaryDirectory(ffmpegCommand),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ].filter((entry, index, entries) => entry && entries.indexOf(entry) === index && fs.existsSync(entry));

  const currentPath = process.env.PATH ?? "";
  const pathEntries = [...extraPathEntries, ...currentPath.split(path.delimiter).filter(Boolean)];

  return {
    ...process.env,
    FFMPEG_PATH: ffmpegCommand,
    PATH: pathEntries.filter((entry, index) => pathEntries.indexOf(entry) === index).join(path.delimiter),
  };
}

function runProcess(command: string, args: string[], preferences: ExtensionPreferences) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      env: buildProcessEnv(preferences),
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Could not start Whisper CLI: ${error.message}. Install whisper or set the Whisper CLI Path preference.`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const errorMessage = stderr.trim();

        if (errorMessage.includes("CERTIFICATE_VERIFY_FAILED")) {
          reject(
            new Error(
              "Whisper could not download its model because Python SSL certificate verification failed. Download the model once from the terminal or configure Python certificates, then try again.",
            ),
          );
          return;
        }

        reject(new Error(errorMessage || `Whisper exited with code ${code}`));
      }
    });
  });
}

function escapeMd(value: string) {
  return value.replace(/[`*_#[\]()]/g, "\\$&");
}
