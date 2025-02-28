import { Clipboard } from "@raycast/api";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { shellEnv } from "shell-env";

let cachedEnv: null | NodeJS.ProcessEnv = null;

async function getShellEnv(): Promise<NodeJS.ProcessEnv> {
  if (cachedEnv) return cachedEnv;
  try {
    cachedEnv = await shellEnv();
    return cachedEnv;
  } catch {
    return process.env;
  }
}

async function execCommand(command: string, args: string[], cwd?: string): Promise<string> {
  const env = await getShellEnv();
  const quotedArgs = args.map((arg) => (arg.includes(" ") ? `"${arg.replace(/"/g, '\\"')}"` : arg));
  const fullCommand = `${command} ${quotedArgs.join(" ")}`;

  return new Promise((resolve, reject) => {
    const child = spawn(fullCommand, [], {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
      cwd,
      env: { ...env, FORCE_COLOR: "1" },
    });

    let stdout = "",
      stderr = "";
    child.stdout?.on("data", (data) => (stdout += data));
    child.stderr?.on("data", (data) => (stderr += data));
    child.on("close", (code) => (code === 0 ? resolve(stdout) : reject(new Error(stderr))));
    child.on("error", reject);
  });
}

async function ensureRealFaviconInstalled(): Promise<void> {
  const tempInstallDir = path.join(os.tmpdir(), "favicon-generator-temp");
  const env = await getShellEnv();
  const npxPath = env.NPX_PATH || "npx";

  if (!fs.existsSync(tempInstallDir)) {
    fs.mkdirSync(tempInstallDir, { recursive: true });
  }

  try {
    await execCommand(npxPath, ["realfavicon", "--version"], tempInstallDir);
  } catch {
    const npmPath = env.npm_execpath || "npm";
    await execCommand(npmPath, ["install", "--save", "cli-real-favicon"], tempInstallDir);
  }
}

interface FaviconConfig {
  icon: {
    desktop: {
      regularIconTransformation: { type: string };
      darkIconType: string;
    };
    touch: {
      transformation: { type: string };
      appTitle: string | null;
    };
    webAppManifest: {
      transformation: { type: string };
      backgroundColor: string;
      name: string;
      shortName: string;
      themeColor: string;
    };
  };
  path: string;
}

export async function generateFavicon(
  masterImage: string | string[],
  outputPath: string | string[],
  htmlFiles: string[],
  options: Partial<FaviconConfig> = {},
): Promise<string> {
  const masterImagePath = Array.isArray(masterImage) ? masterImage[0] : masterImage;
  const outputDir = Array.isArray(outputPath) ? outputPath[0] : outputPath;
  const normalizedMasterImage = path.normalize(masterImagePath);

  if (!fs.existsSync(normalizedMasterImage)) {
    throw new Error(`Master image file does not exist: ${normalizedMasterImage}`);
  }

  const tempDir = os.tmpdir();
  const tempInstallDir = path.join(tempDir, "favicon-generator-temp");
  const configPath = path.join(tempDir, `favicon-settings-${Date.now()}.json`);
  const outputDataPath = path.join(tempDir, `output-data-${Date.now()}.json`);
  const env = await getShellEnv();
  const npxPath = env.NPX_PATH || "npx";

  try {
    await ensureRealFaviconInstalled();

    const config: FaviconConfig = {
      icon: {
        desktop: {
          regularIconTransformation: { type: "none" },
          darkIconType: "none",
        },
        touch: {
          transformation: { type: "none" },
          appTitle: "Favicon Generator",
        },
        webAppManifest: {
          transformation: { type: "none" },
          backgroundColor: "#ffffff",
          name: "Favicon Generator",
          shortName: "Favicons",
          themeColor: "#ffffff",
        },
      },
      path: "/",
      ...options,
    };

    await fs.promises.writeFile(configPath, JSON.stringify(config));
    await execCommand(
      npxPath,
      ["realfavicon", "generate", normalizedMasterImage, configPath, outputDataPath, outputDir],
      tempInstallDir,
    );
    await fs.promises.copyFile(outputDataPath, path.join(outputDir, "output-data.json"));

    const outputIndexPath = path.join(outputDir, `index-${Date.now()}.html`);
    await fs.promises.writeFile(
      outputIndexPath,
      `<!DOCTYPE html><html><head><title>Favicon Example</title></head><body></body></html>`,
    );
    await execCommand(npxPath, ["realfavicon", "inject", outputDataPath, outputDir, outputIndexPath], tempInstallDir);

    const injectedHtml = await fs.promises.readFile(outputIndexPath, "utf8");
    const headMatch = injectedHtml.match(/<head>([\s\S]*?)<\/head>/i);
    if (!headMatch) throw new Error("Could not find head section in injected HTML");

    const faviconTags = headMatch[1]
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          (line.includes("favicon") ||
            line.includes("apple-touch-icon") ||
            line.includes("manifest") ||
            line.includes('meta name="apple-mobile-web-app-title"')),
      )
      .join("\n");

    await Clipboard.copy(faviconTags);

    // Cleanup
    await Promise.all([
      fs.promises.unlink(configPath).catch(() => {}),
      fs.promises.unlink(outputIndexPath).catch(() => {}),
      ...fs
        .readdirSync(outputDir)
        .filter(
          (file) =>
            file.startsWith("index-") && file.endsWith(".html") && path.join(outputDir, file) !== outputIndexPath,
        )
        .map((file) => fs.promises.unlink(path.join(outputDir, file)).catch(() => {})),
    ]);
    return faviconTags;
  } catch (error) {
    await Promise.all([
      fs.promises.unlink(configPath).catch(() => {}),
      fs.promises.unlink(outputDataPath).catch(() => {}),
    ]);
    throw error;
  }
}

export async function checkFavicon(port?: string, hostname: string = "localhost"): Promise<string> {
  const tempInstallDir = path.join(os.tmpdir(), "favicon-generator-temp");
  const env = await getShellEnv();
  const npxPath = env.NPX_PATH || "npx";

  await ensureRealFaviconInstalled();

  let url: string;

  // Check if hostname already includes http:// or https://
  const hasProtocol = hostname.startsWith("http://") || hostname.startsWith("https://");

  if (hasProtocol) {
    try {
      // Parse the URL to handle it properly
      const parsedUrl = new URL(hostname);

      // If port is specified in the function call and not in the URL, add it
      if (port && !parsedUrl.port) {
        parsedUrl.port = port;
      }

      url = parsedUrl.toString();
    } catch (e) {
      // If URL parsing fails, fall back to simple string concatenation
      url = port ? `${hostname}:${port}` : hostname;
    }
  } else {
    // For hostnames without protocol, add http:// and port if specified
    url = port ? `http://${hostname}:${port}` : `http://${hostname}`;
  }

  return execCommand(npxPath, ["realfavicon", "check", url], tempInstallDir);
}
