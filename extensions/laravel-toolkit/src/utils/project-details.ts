import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ProjectDetails {
  laravelVersion: string;
  phpVersion: string;
  database: string;
  debugMode: boolean;
  composer?: unknown;
  starterKit?: string;
  detectedDependencies?: string[];
}

export async function getProjectDetails(projectPath: string): Promise<ProjectDetails> {
  const details: ProjectDetails = {
    laravelVersion: "Unknown",
    phpVersion: "Unknown",
    database: "Unknown",
    debugMode: false,
    starterKit: "Unknown",
  };

  try {
    // Get Laravel Version
    try {
      const { stdout } = await execAsync(`php artisan --version`, { cwd: projectPath });
      const match = stdout.match(/Laravel Framework\s+([0-9.]+)/);
      if (match) details.laravelVersion = match[1];
    } catch {
      // ignore
    }

    // Get PHP Version
    try {
      const { stdout } = await execAsync(`php -v`);
      const match = stdout.match(/^PHP\s+([0-9.]+)/);
      if (match) details.phpVersion = match[1];
    } catch {
      // ignore
    }

    // Read composer.json for Kit Detection
    try {
      const composerPath = path.join(projectPath, "composer.json");
      if (fs.existsSync(composerPath)) {
        const composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));
        details.composer = composer;

        const require = composer.require || {};
        const requireDev = composer["require-dev"] || {};
        const allDeps = { ...require, ...requireDev };

        const notable: string[] = [];
        const NOTABLE_PACKAGES: Record<string, string> = {
          "laravel/jetstream": "Jetstream",
          "laravel/breeze": "Breeze",
          "filament/filament": "Filament",
          "livewire/livewire": "Livewire",
          "livewire/flux": "Flux",
          "livewire/volt": "Volt",
          "inertiajs/inertia-laravel": "Inertia",
          "laravel/nova": "Nova",
          "statamic/cms": "Statamic",
        };

        for (const [pkg, label] of Object.entries(NOTABLE_PACKAGES)) {
          if (allDeps[pkg]) {
            notable.push(label);
          }
        }

        details.starterKit = notable.length > 0 ? notable.join(", ") : "Standard";
        details.detectedDependencies = Object.keys(allDeps);
      }
    } catch {
      // ignore
    }

    // Read .env for DB and Debug
    const envPath = path.join(projectPath, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const dbConnection = envContent.match(/^DB_CONNECTION=(.*)$/m)?.[1] || "";
      const dbDatabase = envContent.match(/^DB_DATABASE=(.*)$/m)?.[1] || "";
      const appDebug = envContent.match(/^APP_DEBUG=(.*)$/m)?.[1] || "false";

      details.database = `${dbConnection} (${dbDatabase})`;
      details.debugMode = appDebug.trim().toLowerCase() === "true";
    }

    // 4. Read composer.json for extra metadata if needed
    const composerPath = path.join(projectPath, "composer.json");
    if (fs.existsSync(composerPath)) {
      try {
        details.composer = JSON.parse(fs.readFileSync(composerPath, "utf-8"));
      } catch {
        // ignore
      }
    }
  } catch (error) {
    console.error("Failed to get project details", error);
  }

  return details;
}
