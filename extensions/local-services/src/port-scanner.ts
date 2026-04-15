import { execFile } from "child_process";
import { promisify } from "util";
import { LocalService, ProcessType } from "./types";

const execFileAsync = promisify(execFile);

// Map common process names to a ProcessType for icon display
function detectProcessType(processName: string): ProcessType {
  const name = processName.toLowerCase();
  if (name.includes("node") || name.includes("next") || name.includes("vite") || name.includes("webpack")) {
    return "node";
  }
  if (
    name.includes("python") ||
    name.includes("uvicorn") ||
    name.includes("gunicorn") ||
    name.includes("flask") ||
    name.includes("django")
  ) {
    return "python";
  }
  if (name.includes("ruby") || name.includes("puma") || name.includes("rails")) {
    return "ruby";
  }
  if (name.includes("java") || name.includes("spring") || name.includes("tomcat")) {
    return "java";
  }
  if (name.includes("php") || name.includes("artisan") || name.includes("laravel")) {
    return "php";
  }
  if (name.includes("cargo") || name.includes("rustc")) {
    return "rust";
  }
  if (name.includes("docker") || name.includes("com.docker")) {
    return "docker";
  }
  if (name === "go" || name.startsWith("go ") || name.includes("gin") || name.includes("fiber")) {
    return "go";
  }
  return "other";
}

// Parse the output of lsof to extract listening services
function parseLsofOutput(stdout: string): LocalService[] {
  const lines = stdout.trim().split("\n");
  // Skip the header line
  const dataLines = lines.slice(1);

  const seen = new Set<string>();
  const services: LocalService[] = [];

  for (const line of dataLines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) continue;

    const processName = parts[0];
    const pid = parseInt(parts[1], 10);
    const nameField = parts[8]; // e.g. "*:3000" or "127.0.0.1:8080" or "[::1]:5173"

    if (!nameField || !nameField.includes(":")) continue;

    const lastColon = nameField.lastIndexOf(":");
    const address = nameField.substring(0, lastColon);
    const port = parseInt(nameField.substring(lastColon + 1), 10);

    if (isNaN(port)) continue;

    // Deduplicate by port+pid
    const key = `${port}-${pid}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const normalizedAddress = address === "*" || address === "[::]" ? "0.0.0.0" : address;

    services.push({
      id: `lsof-${port}-${pid}`,
      port,
      pid,
      processName,
      address: normalizedAddress,
      source: "lsof",
      status: "running",
      processType: detectProcessType(processName),
    });
  }

  return services;
}

// Main function: get all listening TCP ports via lsof
export async function getListeningPorts(): Promise<LocalService[]> {
  try {
    const { stdout } = await execFileAsync("lsof", ["-iTCP", "-sTCP:LISTEN", "-nP"]);
    return parseLsofOutput(stdout);
  } catch {
    // lsof may fail if no ports are listening or permissions issue
    return [];
  }
}
