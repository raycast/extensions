import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { environment, showToast, Toast } from "@raycast/api";

const execAsync = promisify(exec);
const EXEC_MAX_BUFFER = 10 * 1024 * 1024;
const VENV_CREATE_TIMEOUT = 3 * 60 * 1000;
const PIP_UPGRADE_TIMEOUT = 3 * 60 * 1000;
const PIP_INSTALL_TIMEOUT = 12 * 60 * 1000;

const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
];

// System python paths to search (used to create the venv).
// Keep explicit versions first to avoid selecting unsupported/newer runtimes by accident.
const PYTHON_CANDIDATES = [
  "/opt/homebrew/bin/python3.13",
  "/usr/local/bin/python3.13",
  "/opt/homebrew/bin/python3.12",
  "/usr/local/bin/python3.12",
  "/opt/homebrew/bin/python3.11",
  "/usr/local/bin/python3.11",
  "/opt/homebrew/bin/python3.10",
  "/usr/local/bin/python3.10",
  "/opt/homebrew/bin/python3",
  "/usr/local/bin/python3",
  "python3.13",
  "python3.12",
  "python3.11",
  "python3.10",
  "python3",
];
const SUPPORTED_PYTHON_MIN_MINOR = 10;
const SUPPORTED_PYTHON_MAX_MINOR = 13;

interface PythonVersion {
  major: number;
  minor: number;
  patch: number;
}

interface PythonCandidate {
  path: string;
  version: PythonVersion;
  supported: boolean;
}

export type ProcessingMode = "quality" | "speed";

interface ProcessingPreset {
  modelCandidates: string[];
  alphaMatting: boolean;
  alphaMattingForegroundThreshold: number;
  alphaMattingBackgroundThreshold: number;
  alphaMattingErodeSize: number;
  postProcessMask: boolean;
  timeoutMs: number;
}

const PROCESSING_PRESETS: Record<ProcessingMode, ProcessingPreset> = {
  // Best visual quality for people/portraits with robust fallbacks.
  quality: {
    modelCandidates: [
      "birefnet-portrait",
      "isnet-general-use",
      "u2net_human_seg",
      "u2net",
    ],
    alphaMatting: true,
    alphaMattingForegroundThreshold: 240,
    alphaMattingBackgroundThreshold: 12,
    alphaMattingErodeSize: 6,
    postProcessMask: true,
    timeoutMs: 4 * 60 * 1000,
  },
  // Fastest practical setup while keeping decent output.
  speed: {
    modelCandidates: ["u2netp", "u2net"],
    alphaMatting: false,
    alphaMattingForegroundThreshold: 240,
    alphaMattingBackgroundThreshold: 10,
    alphaMattingErodeSize: 10,
    postProcessMask: false,
    timeoutMs: 60 * 1000,
  },
};

// The venv lives inside Raycast's extension support directory
function getVenvDir(): string {
  return path.join(environment.supportPath, "venv");
}

function getVenvPython(): string {
  return path.join(getVenvDir(), "bin", "python3");
}

/**
 * Discover python3 candidates to bootstrap the virtualenv.
 * Supported versions are preferred, but newer 3.x are kept as fallback.
 */
async function findSystemPythonCandidates(): Promise<PythonCandidate[]> {
  const candidates = [...new Set(PYTHON_CANDIDATES)];
  const found: PythonCandidate[] = [];

  for (const candidate of candidates) {
    const version = await getPythonVersion(candidate);
    if (!version) continue;

    found.push({
      path: candidate,
      version,
      supported: isSupportedPython(version),
    });
  }

  found.sort((a, b) => comparePythonCandidates(a, b));
  return found;
}

function comparePythonCandidates(
  a: PythonCandidate,
  b: PythonCandidate,
): number {
  // Supported versions first
  if (a.supported !== b.supported) {
    return a.supported ? -1 : 1;
  }

  // Then prefer newer versions
  if (a.version.major !== b.version.major)
    return b.version.major - a.version.major;
  if (a.version.minor !== b.version.minor)
    return b.version.minor - a.version.minor;
  return b.version.patch - a.version.patch;
}

function formatVersion(version: PythonVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function buildNoPythonError(found: PythonCandidate[]): string {
  if (found.length === 0) {
    return (
      "Compatible Python version not found.\n" +
      "rembg works best with Python 3.10 to 3.13.\n" +
      "No python3 executable found in known locations.\n" +
      "Install one with: brew install python@3.13"
    );
  }

  const detected = found
    .map((item) => `${item.path} (${formatVersion(item.version)})`)
    .join(", ");

  return (
    `Compatible Python version not found.\n` +
    `rembg currently works best with Python 3.10 to 3.13.\n` +
    `Detected unsupported versions: ${detected}\n` +
    `Install one with: brew install python@3.13`
  );
}

async function getPythonVersion(
  candidate: string,
): Promise<PythonVersion | null> {
  try {
    const { stdout } = await execAsync(
      `"${candidate}" -c "import sys; print('.'.join(map(str, sys.version_info[:3])))"`,
      { timeout: 5000 },
    );

    const match = stdout.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return null;

    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    };
  } catch {
    return null;
  }
}

function isSupportedPython(version: PythonVersion): boolean {
  return (
    version.major === 3 &&
    version.minor >= SUPPORTED_PYTHON_MIN_MINOR &&
    version.minor <= SUPPORTED_PYTHON_MAX_MINOR
  );
}

function formatExecError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);

  const typed = error as {
    code?: number | string;
    killed?: boolean;
    message?: string;
    signal?: string | null;
    stderr?: string;
    stdout?: string;
  };

  if (typed.killed || typed.signal === "SIGTERM") {
    return "Command timed out";
  }

  const stderr = tailLines(typed.stderr, 8);
  if (stderr) return stderr;

  const stdout = tailLines(typed.stdout, 8);
  if (stdout) return stdout;

  const message = tailLines(typed.message, 8);
  if (message) return message;

  if (typed.code !== undefined && typed.code !== null) {
    return `Command failed with exit code ${typed.code}`;
  }

  return String(error);
}

function tailLines(value: string | undefined, lineCount: number): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lines = trimmed.split("\n");
  return lines.slice(-lineCount).join("\n");
}

/**
 * Check if the dedicated venv exists and has rembg installed.
 */
async function isVenvReady(): Promise<boolean> {
  const venvPython = getVenvPython();
  if (!fs.existsSync(venvPython)) return false;

  try {
    await execAsync(
      `"${venvPython}" -c "import onnxruntime; from rembg import remove"`,
      {
        timeout: 15000,
        maxBuffer: EXEC_MAX_BUFFER,
      },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Create the virtualenv and install rembg into it.
 */
async function setupVenv(): Promise<void> {
  const venvDir = getVenvDir();
  const venvPython = getVenvPython();
  const setupErrors: string[] = [];

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "⏳ First-time setup...",
    message: "Creating Python environment",
  });

  // 1. Find system Python candidates
  const pythonCandidates = await findSystemPythonCandidates();
  if (pythonCandidates.length === 0) {
    throw new Error(buildNoPythonError(pythonCandidates));
  }

  const orderedCandidates = [
    ...pythonCandidates.filter((candidate) => candidate.supported),
    ...pythonCandidates.filter(
      (candidate) => !candidate.supported && candidate.version.major === 3,
    ),
  ];

  if (orderedCandidates.length === 0) {
    throw new Error(buildNoPythonError(pythonCandidates));
  }

  // 2. Try candidates in order: supported first, then Python 3 fallback versions.
  for (const candidate of orderedCandidates) {
    // Recreate venv for each candidate attempt
    if (fs.existsSync(venvDir)) {
      fs.rmSync(venvDir, { recursive: true, force: true });
    }

    const fallbackLabel = candidate.supported ? "" : " (fallback)";
    toast.message = `Creating Python environment (${formatVersion(candidate.version)}${fallbackLabel})...`;
    try {
      await execAsync(`"${candidate.path}" -m venv "${venvDir}"`, {
        timeout: VENV_CREATE_TIMEOUT,
        maxBuffer: EXEC_MAX_BUFFER,
      });
    } catch (error) {
      setupErrors.push(
        `${candidate.path} (${formatVersion(candidate.version)}): venv failed: ${formatExecError(error)}`,
      );
      continue;
    }

    // 3. Upgrade pip
    toast.message = "Upgrading pip...";
    try {
      await execAsync(
        `"${venvPython}" -m pip install --upgrade pip setuptools wheel`,
        {
          timeout: PIP_UPGRADE_TIMEOUT,
          maxBuffer: EXEC_MAX_BUFFER,
        },
      );
    } catch {
      // Non-critical, continue
    }

    // 4. Install rembg + core runtime dependencies
    toast.message = "Installing rembg (first run may take a few minutes)...";
    try {
      await execAsync(
        `"${venvPython}" -m pip install --upgrade --prefer-binary rembg pillow onnxruntime`,
        {
          timeout: PIP_INSTALL_TIMEOUT,
          maxBuffer: EXEC_MAX_BUFFER,
        },
      );
    } catch (error) {
      setupErrors.push(
        `${candidate.path} (${formatVersion(candidate.version)}): install failed: ${formatExecError(error)}`,
      );
      fs.rmSync(venvDir, { recursive: true, force: true });
      continue;
    }

    // 5. Verify
    toast.message = "Verifying installation...";
    try {
      await execAsync(
        `"${venvPython}" -c "import onnxruntime; from rembg import remove"`,
        {
          timeout: 30000,
          maxBuffer: EXEC_MAX_BUFFER,
        },
      );
    } catch (error) {
      setupErrors.push(
        `${candidate.path} (${formatVersion(candidate.version)}): import failed: ${formatExecError(error)}`,
      );
      fs.rmSync(venvDir, { recursive: true, force: true });
      continue;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Setup complete!";
    toast.message = "rembg is ready to use";
    return;
  }

  const shortErrors = setupErrors.slice(0, 2).join("\n");
  throw new Error(
    "Failed to prepare Python environment for rembg.\n" +
      (shortErrors ? `${shortErrors}\n` : "") +
      "Recommended fix: install Python 3.13 with `brew install python@3.13` and retry.",
  );
}

/**
 * Ensure rembg is available in a dedicated venv.
 * Auto-creates the venv and installs rembg on first run.
 * Returns the path to the venv's python.
 */
export async function ensureRembg(): Promise<string> {
  if (await isVenvReady()) {
    return getVenvPython();
  }

  await setupVenv();
  return getVenvPython();
}

export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Remove background using the Python rembg API directly.
 */
export async function removeBackground(
  inputPath: string,
  outputPath: string,
  pythonPath: string,
  mode: ProcessingMode = "quality",
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const preset = PROCESSING_PRESETS[mode];

  const script = `
import sys
from rembg import remove, new_session

input_path = sys.argv[1]
output_path = sys.argv[2]
model_candidates = [item.strip() for item in sys.argv[3].split(",") if item.strip()]
alpha_matting = sys.argv[4] == "1"
alpha_fg = int(sys.argv[5])
alpha_bg = int(sys.argv[6])
alpha_erode = int(sys.argv[7])
post_process_mask = sys.argv[8] == "1"

with open(input_path, "rb") as f:
    input_data = f.read()

session = None
for model_name in model_candidates:
    try:
        session = new_session(model_name)
        break
    except Exception:
        continue

remove_kwargs = {
    "session": session,
    "post_process_mask": post_process_mask,
}

if alpha_matting:
    remove_kwargs.update({
        "alpha_matting": True,
        "alpha_matting_foreground_threshold": alpha_fg,
        "alpha_matting_background_threshold": alpha_bg,
        "alpha_matting_erode_size": alpha_erode,
    })

output_data = remove(input_data, **remove_kwargs)

with open(output_path, "wb") as f:
    f.write(output_data)

print("ok")
`.trim();

  const scriptPath = path.join(environment.supportPath, "rembg_run.py");
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.writeFileSync(scriptPath, script);

  try {
    const modelCandidatesArg = preset.modelCandidates.join(",");
    const alphaMattingArg = preset.alphaMatting ? "1" : "0";
    const postProcessArg = preset.postProcessMask ? "1" : "0";

    const { stdout, stderr } = await execAsync(
      `"${pythonPath}" "${scriptPath}" "${inputPath}" "${outputPath}" "${modelCandidatesArg}" "${alphaMattingArg}" "${preset.alphaMattingForegroundThreshold}" "${preset.alphaMattingBackgroundThreshold}" "${preset.alphaMattingErodeSize}" "${postProcessArg}"`,
      {
        timeout: preset.timeoutMs,
        maxBuffer: EXEC_MAX_BUFFER,
      },
    );

    if (!stdout.includes("ok")) {
      throw new Error(`rembg failed: ${stderr || "unknown error"}`);
    }
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch {
      /* ignore */
    }
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error("Output file was not created.");
  }

  return outputPath;
}

export function getOutputPath(inputPath: string, suffix: string): string {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const name = path.basename(inputPath, ext);
  return path.join(dir, `${name}${suffix}.png`);
}
