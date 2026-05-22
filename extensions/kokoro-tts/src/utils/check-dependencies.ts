import { environment } from "@raycast/api";
import { execFileSync } from "child_process";
import { join } from "path";

interface DependencyError {
  title: string;
  message: string;
  fixCommand?: string;
}

export class DependencySetupError extends Error {
  readonly errorTitle: string;
  readonly fixCommand?: string;

  constructor(title: string, message: string, fixCommand?: string) {
    super(message);
    this.name = "DependencySetupError";
    this.errorTitle = title;
    this.fixCommand = fixCommand;
  }
}

export function checkDependencies(pythonPath: string): DependencyError | null {
  try {
    execFileSync(pythonPath, ["--version"], {
      timeout: 5_000,
      stdio: "ignore",
    });
  } catch {
    return {
      title: "Python not found",
      message: `Could not run "${pythonPath}". Install Python 3 or set the correct path in extension preferences.`,
      fixCommand: "brew install python3",
    };
  }

  try {
    execFileSync(pythonPath, ["-c", "import mlx_audio.tts, misaki"], {
      timeout: 20_000,
      stdio: "ignore",
    });
  } catch {
    const requirements = join(environment.assetsPath, "requirements.txt");
    return {
      title: "MLX-Kokoro not installed",
      message:
        "The mlx-audio packages are missing. Run the fix command in Terminal to install them for the selected Python.",
      fixCommand: `"${pythonPath}" -m pip install -r "${requirements}"`,
    };
  }

  return null;
}
