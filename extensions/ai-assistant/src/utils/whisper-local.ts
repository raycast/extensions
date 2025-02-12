import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Homebrew binary paths
const FFMPEG_PATH = "/opt/homebrew/bin/ffmpeg";
const FFPROBE_PATH = "/opt/homebrew/bin/ffprobe";

const WHISPER_MODELS = {
  tiny: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
  base: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
  small: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
  medium: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
};

const WHISPER_SOURCE_URL = "https://github.com/ggerganov/whisper.cpp/archive/refs/tags/v1.5.4.tar.gz";
const WHISPER_DIR = path.join(os.homedir(), ".raycast-whisper");
const WHISPER_MODELS_DIR = path.join(WHISPER_DIR, "models");
const WHISPER_BIN_DIR = path.join(WHISPER_DIR, "bin");
const WHISPER_SRC_DIR = path.join(WHISPER_DIR, "src");

/**
 * Show a system notification using osascript
 */
async function showSystemNotification(title: string, message: string) {
  const script = `
    display notification "${message}" with title "${title}"
  `;
  await execAsync(`osascript -e '${script}'`);
}

/**
 * Ensure all necessary directories exist
 */
async function ensureDirectories() {
  if (!fs.existsSync(WHISPER_DIR)) {
    fs.mkdirSync(WHISPER_DIR);
  }
  if (!fs.existsSync(WHISPER_MODELS_DIR)) {
    fs.mkdirSync(WHISPER_MODELS_DIR);
  }
  if (!fs.existsSync(WHISPER_BIN_DIR)) {
    fs.mkdirSync(WHISPER_BIN_DIR);
  }
}

/**
 * Check if Whisper is installed locally
 */
export function isWhisperInstalled(): boolean {
  const whisperPath = path.join(WHISPER_BIN_DIR, "whisper");
  return fs.existsSync(whisperPath);
}

/**
 * Check if a specific Whisper model is downloaded
 */
export function isModelDownloaded(model: string): boolean {
  const modelPath = path.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);
  return fs.existsSync(modelPath);
}

/**
 * Check if Whisper binary is properly installed and working
 */
export async function isWhisperBinaryWorking(): Promise<boolean> {
  const whisperPath = path.join(WHISPER_BIN_DIR, "whisper");
  if (!fs.existsSync(whisperPath)) {
    console.log("Binary not found at:", whisperPath);
    return false;
  }

  try {
    // Vérifier les permissions
    const stats = fs.statSync(whisperPath);
    const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
    if (!isExecutable) {
      console.log("Binary is not executable");
      return false;
    }

    // Exécuter avec --help et vérifier la sortie
    const { stdout, stderr } = await execAsync(`${whisperPath} --help`);
    console.log("Whisper help output:", stdout);
    console.log("Whisper help stderr:", stderr);

    // Vérification moins stricte : le binaire doit juste s'exécuter sans erreur
    return true;
  } catch (error) {
    console.error("Error checking whisper binary:", error);
    return false;
  }
}

/**
 * Clean up Whisper installation
 */
export async function cleanupWhisper(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Cleaning Up Whisper",
    message: "Preparing cleanup...",
  });

  try {
    // Check if directories exist
    if (fs.existsSync(WHISPER_DIR)) {
      toast.message = "Removing Whisper files...";

      // Get size before deletion
      let totalSize = 0;
      const getSizeRecursive = (dirPath: string): number => {
        let size = 0;
        try {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            try {
              const filePath = path.join(dirPath, file);
              const stats = fs.statSync(filePath);
              if (stats.isDirectory()) {
                size += getSizeRecursive(filePath);
              } else {
                size += stats.size;
              }
            } catch (error) {
              // Skip files that can't be accessed
              console.warn(`Skipping file ${file}:`, error);
            }
          }
        } catch (error) {
          // Skip directories that can't be accessed
          console.warn(`Skipping directory ${dirPath}:`, error);
        }
        return size;
      };

      try {
        totalSize = getSizeRecursive(WHISPER_DIR);
      } catch (error) {
        console.warn("Failed to calculate total size:", error);
        totalSize = 0;
      }

      // Remove all files
      fs.rmSync(WHISPER_DIR, { recursive: true, force: true });

      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
      const message = totalSize > 0 ? `Cleanup complete! Freed ${sizeInMB}MB of space` : "Cleanup complete!";

      toast.style = Toast.Style.Success;
      toast.message = message;

      await showSystemNotification(
        "Whisper Cleanup Complete",
        totalSize > 0
          ? `Successfully removed Whisper files and freed ${sizeInMB}MB of space.`
          : "Successfully removed Whisper files.",
      );
    } else {
      toast.style = Toast.Style.Success;
      toast.message = "Nothing to clean up";
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await toast.hide();
  } catch (error) {
    console.error("Error cleaning up Whisper:", error);
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to clean up Whisper files";
    throw new Error("Failed to clean up Whisper files");
  }
}

/**
 * Install Whisper locally
 */
export async function installWhisper(): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Installing Whisper",
    message: "Checking current installation...",
  });

  try {
    // First check if everything is already working
    if (await isWhisperBinaryWorking()) {
      toast.style = Toast.Style.Success;
      toast.message = "Whisper is already installed and working!";
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await toast.hide();
      return;
    }

    await ensureDirectories();

    const whisperBin = path.join(WHISPER_BIN_DIR, "whisper");
    const tempDir = path.join(WHISPER_DIR, "temp");
    const srcDir = WHISPER_SRC_DIR;

    // Remove existing files if they exist
    if (fs.existsSync(whisperBin)) {
      fs.unlinkSync(whisperBin);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (fs.existsSync(srcDir)) {
      fs.rmSync(srcDir, { recursive: true, force: true });
    }

    // Create temp directory
    fs.mkdirSync(tempDir);

    toast.message = "Downloading source code...";
    console.log("Downloading source from:", WHISPER_SOURCE_URL);

    // Download source code
    const archivePath = path.join(tempDir, "whisper.tar.gz");
    await execAsync(`curl -L "${WHISPER_SOURCE_URL}" -o "${archivePath}"`);

    // Extract source code
    toast.message = "Extracting source code...";
    await execAsync(`cd "${tempDir}" && tar xzf whisper.tar.gz`);

    // Move source to final location
    const extractedDir = path.join(tempDir, "whisper.cpp-1.5.4");
    fs.renameSync(extractedDir, srcDir);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Compile
    toast.message = "Compiling Whisper...";
    console.log("Compiling in directory:", srcDir);
    await execAsync(`cd "${srcDir}" && make clean && make`);

    // Copy binary
    fs.copyFileSync(path.join(srcDir, "main"), whisperBin);
    await execAsync(`chmod +x "${whisperBin}"`);
    console.log("Copied and made binary executable");

    // Set locale for proper binary execution
    process.env.LANG = "en_US.UTF-8";
    process.env.LC_ALL = "en_US.UTF-8";

    // Wait a moment for the file system to update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Try to run the binary with different options
    try {
      const { stdout: versionOut } = await execAsync(`"${whisperBin}" --version`);
      console.log("Whisper version output:", versionOut);
    } catch (error) {
      console.log("Version check failed, trying help...");
      const { stdout: helpOut } = await execAsync(`"${whisperBin}" --help`);
      console.log("Whisper help output:", helpOut);
    }

    // Final verification
    const isWorking = await isWhisperBinaryWorking();
    if (!isWorking) {
      throw new Error("Installation verification failed - binary not working properly");
    }

    toast.style = Toast.Style.Success;
    toast.message = "Whisper installed successfully!";

    await showSystemNotification(
      "Offline Dictation Ready",
      "Whisper has been installed successfully. You can now use offline dictation with downloaded models.",
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await toast.hide();
  } catch (error) {
    console.error("Error installing Whisper:", error);
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to install Whisper";

    await showSystemNotification(
      "Whisper Installation Failed",
      "Installation failed. You can continue using online dictation. Try installing again later.",
    );

    throw new Error(`Failed to install Whisper: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Download a specific Whisper model
 */
export async function downloadModel(model: string): Promise<void> {
  if (!WHISPER_MODELS[model as keyof typeof WHISPER_MODELS]) {
    throw new Error(`Invalid model: ${model}`);
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Downloading ${model} Model`,
    message: "Preparing download...",
  });

  try {
    await ensureDirectories();

    const modelUrl = WHISPER_MODELS[model as keyof typeof WHISPER_MODELS];
    const modelPath = path.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);

    toast.message = "Downloading model file...";
    await execAsync(`curl -L ${modelUrl} -o ${modelPath}`);

    toast.style = Toast.Style.Success;
    toast.message = "Model downloaded successfully!";
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Show success message for 1 second
    await toast.hide();
  } catch (error) {
    console.error("Error downloading model:", error);
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to download model";
    throw new Error("Failed to download model");
  }
}

/**
 * Check if local transcription is available
 */
export function isLocalTranscriptionAvailable(model: string): boolean {
  return isWhisperInstalled() && isModelDownloaded(model);
}

/**
 * Transcribe audio using local Whisper
 */
export async function transcribeAudio(audioPath: string, model: string, language?: string): Promise<string> {
  console.log("Starting local transcription:", {
    audioPath,
    model,
    language,
  });

  // Check if local transcription is available
  const whisperInstalled = await isWhisperInstalled();
  if (!whisperInstalled) {
    throw new Error("Whisper is not installed");
  }

  if (!isModelDownloaded(model)) {
    throw new Error(`Model ${model} is not downloaded`);
  }

  const modelPath = path.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);
  const whisperPath = path.join(WHISPER_BIN_DIR, "whisper");

  console.log("Using Whisper configuration:", {
    modelPath,
    whisperPath,
    exists: {
      model: fs.existsSync(modelPath),
      binary: fs.existsSync(whisperPath),
      audio: fs.existsSync(audioPath),
    },
  });

  // Verify audio file format
  try {
    const { stdout: ffprobeOut } = await execAsync(`"${FFPROBE_PATH}" -i "${audioPath}" 2>&1`);
    console.log("Audio file info:", ffprobeOut);
  } catch (error) {
    console.warn("Could not get audio file info:", error);
  }

  try {
    // Convert audio to the correct format for Whisper
    const wavPath = `${audioPath}.converted.wav`;
    console.log("Converting audio to compatible format...");
    await execAsync(`"${FFMPEG_PATH}" -y -i "${audioPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`);
    console.log("Audio conversion completed");

    // Build Whisper command with all necessary options
    const languageParam = language && language !== "auto" ? ` -l ${language}` : "";
    // Disable translation when in auto mode, otherwise translate to target language
    const translateParam = !language || language === "auto" ? " --language auto" : "";
    const command = `${whisperPath} -m ${modelPath} -f "${wavPath}" -osrt -nt${languageParam}${translateParam}`;
    console.log("Executing Whisper command:", command);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.warn("Whisper stderr output:", stderr);
    }

    console.log("Whisper stdout length:", stdout.length);
    console.log("Whisper stdout preview:", stdout.substring(0, 200));

    // Clean up converted file
    try {
      fs.unlinkSync(wavPath);
    } catch (error) {
      console.warn("Could not delete converted audio file:", error);
    }

    const text = stdout.trim();
    if (!text) {
      throw new Error("Whisper produced empty output");
    }

    return text;
  } catch (error) {
    console.error("Error executing Whisper:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to execute Whisper: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get the list of downloaded models
 */
export function getDownloadedModels(): string[] {
  if (!fs.existsSync(WHISPER_MODELS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(WHISPER_MODELS_DIR)
    .filter((file) => file.startsWith("ggml-") && file.endsWith(".bin"))
    .map((file) => file.replace("ggml-", "").replace(".bin", ""));
}

/**
 * Get the list of available models
 */
export function getAvailableModels(): string[] {
  return Object.keys(WHISPER_MODELS);
}

/**
 * Clean up old model files (not used in last 30 days)
 */
export async function cleanupOldModels(): Promise<void> {
  if (!fs.existsSync(WHISPER_MODELS_DIR)) {
    return;
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(WHISPER_MODELS_DIR);
  for (const file of files) {
    const filePath = path.join(WHISPER_MODELS_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.atimeMs < thirtyDaysAgo) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up old model: ${file}`);
    }
  }
}
