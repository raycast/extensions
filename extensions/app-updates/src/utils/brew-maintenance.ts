import { execFile } from "child_process";
import { promisify } from "util";
import { getBrewPath } from "./brew-path";
import { storeDoctorWarnings } from "./doctor-store";

const execFileAsync = promisify(execFile);

export type StepResult = {
  name: string;
  success: boolean;
  output: string;
  duration: number;
};

export type BrewReport = {
  steps: StepResult[];
  updatedFormulae: string[];
  updatedCasks: string[];
  doctorWarnings: DoctorWarning[];
  cleanedUp: string;
  totalDuration: number;
  ranAt: string;
};

async function runStep(name: string, brewPath: string, args: string[]): Promise<StepResult> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(brewPath, args, { timeout: 300000 });
    return {
      name,
      success: true,
      output: [stdout, stderr].filter(Boolean).join("\n").trim(),
      duration: Date.now() - start,
    };
  } catch (err: unknown) {
    const error = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    // brew doctor exits with 1 when there are warnings — that's not a failure
    const hasOutput = Boolean(error.stdout || error.stderr);
    return {
      name,
      success: name === "brew doctor" && hasOutput,
      output: [error.stdout, error.stderr].filter(Boolean).join("\n").trim() || (error.message ?? "Unknown error"),
      duration: Date.now() - start,
    };
  }
}

function parseUpgraded(output: string): { formulae: string[]; casks: string[] } {
  const formulae: string[] = [];
  const casks: string[] = [];

  // Individual formulae upgrades: ==> Upgrading package
  const upgraded = output.match(/^==> Upgrading (\S+)$/gm);
  if (upgraded) {
    for (const line of upgraded) {
      formulae.push(line.replace("==> Upgrading ", ""));
    }
  }

  // Cask upgrades: ==> Upgrading Cask package
  const caskUpgraded = output.match(/^==> Upgrading Cask (\S+)/gm);
  if (caskUpgraded) {
    for (const line of caskUpgraded) {
      casks.push(line.replace("==> Upgrading Cask ", ""));
    }
  }

  // Fallback: parse "package old_ver -> new_ver" lines
  if (formulae.length === 0 && casks.length === 0) {
    const versionLines = output.match(/^\S+ .+ -> .+$/gm);
    if (versionLines) {
      for (const line of versionLines) {
        const name = line.split(" ")[0];
        if (name) formulae.push(name);
      }
    }
  }

  return { formulae, casks };
}

export type DoctorWarning = {
  title: string;
  details: string;
};

function parseDoctorWarnings(output: string): DoctorWarning[] {
  const warnings: DoctorWarning[] = [];
  const warningBlocks = output.split(/^Warning: /gm);
  for (let i = 1; i < warningBlocks.length; i++) {
    const lines = warningBlocks[i].trim().split("\n");
    const title = lines[0]?.trim();
    if (!title) continue;
    const details = lines.slice(1).join("\n").trim();
    warnings.push({ title, details });
  }
  return warnings;
}

export type BrewMaintenanceOptions = {
  runUpdate: boolean;
  runUpgradeFormulae: boolean;
  runUpgradeCasks: boolean;
  runDoctor: boolean;
  runCleanup: boolean;
  onStep?: (stepName: string) => void;
};

export async function runBrewMaintenance(options: BrewMaintenanceOptions): Promise<BrewReport> {
  const brewPath = await getBrewPath();
  if (!brewPath) {
    return {
      steps: [{ name: "brew", success: false, output: "Homebrew not found", duration: 0 }],
      updatedFormulae: [],
      updatedCasks: [],
      doctorWarnings: [],
      cleanedUp: "",
      totalDuration: 0,
      ranAt: new Date().toISOString(),
    };
  }

  const totalStart = Date.now();
  const steps: StepResult[] = [];
  let updatedFormulae: string[] = [];
  let updatedCasks: string[] = [];
  let doctorWarnings: DoctorWarning[] = [];
  let cleanedUp = "";

  if (options.runUpdate) {
    options.onStep?.("Updating Homebrew index...");
    steps.push(await runStep("brew update", brewPath, ["update"]));
  }

  if (options.runUpgradeFormulae) {
    options.onStep?.("Upgrading formulae...");
    const result = await runStep("brew upgrade", brewPath, ["upgrade"]);
    steps.push(result);
    if (result.success) {
      updatedFormulae = parseUpgraded(result.output).formulae;
    }
  }

  if (options.runUpgradeCasks) {
    options.onStep?.("Upgrading casks...");
    const result = await runStep("brew upgrade --cask", brewPath, ["upgrade", "--cask"]);
    steps.push(result);
    if (result.success) {
      updatedCasks = parseUpgraded(result.output).casks;
    }
  }

  if (options.runDoctor) {
    options.onStep?.("Running brew doctor...");
    const result = await runStep("brew doctor", brewPath, ["doctor"]);
    steps.push(result);
    doctorWarnings = parseDoctorWarnings(result.output);
    await storeDoctorWarnings(doctorWarnings);
  }

  if (options.runCleanup) {
    options.onStep?.("Cleaning up...");
    const result = await runStep("brew cleanup", brewPath, ["cleanup", "--prune=7"]);
    steps.push(result);
    if (result.success) {
      cleanedUp = result.output;
    }
  }

  return {
    steps,
    updatedFormulae,
    updatedCasks,
    doctorWarnings,
    cleanedUp,
    totalDuration: Date.now() - totalStart,
    ranAt: new Date().toISOString(),
  };
}
