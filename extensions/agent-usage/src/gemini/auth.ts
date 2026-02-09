import * as fs from "fs";
import * as path from "path";
import { resolveGeminiBinaryPath } from "./binary";

interface GeminiSettings {
  authType?: string;
  security?: {
    auth?: {
      selectedType?: string;
    };
  };
}

interface GeminiOAuthClientCredentials {
  clientId: string;
  clientSecret: string;
}

const GEMINI_OAUTH_CLIENT_ID_ENV_KEY = "GEMINI_OAUTH_CLIENT_ID";
const GEMINI_OAUTH_CLIENT_SECRET_ENV_KEY = "GEMINI_OAUTH_CLIENT_SECRET";

const GEMINI_OAUTH2_RELATIVE_PATH = path.join(
  "node_modules",
  "@google",
  "gemini-cli-core",
  "dist",
  "src",
  "code_assist",
  "oauth2.js",
);

function cleanString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function findGeminiOauth2FilePath(binaryPath: string): string | null {
  try {
    const realPath = fs.realpathSync(binaryPath);
    let currentDir = path.dirname(realPath);

    for (let i = 0; i < 8; i++) {
      const directCorePath = path.join(currentDir, GEMINI_OAUTH2_RELATIVE_PATH);
      if (fs.existsSync(directCorePath)) {
        return directCorePath;
      }

      const nestedCliPath = path.join(currentDir, "@google", "gemini-cli", GEMINI_OAUTH2_RELATIVE_PATH);
      if (fs.existsSync(nestedCliPath)) {
        return nestedCliPath;
      }

      const homebrewPath = path.join(
        currentDir,
        "libexec",
        "lib",
        "node_modules",
        "@google",
        "gemini-cli",
        GEMINI_OAUTH2_RELATIVE_PATH,
      );
      if (fs.existsSync(homebrewPath)) {
        return homebrewPath;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    return null;
  } catch {
    return null;
  }
}

function readGeminiOauth2FileContent(): string | null {
  try {
    const binaryPath = resolveGeminiBinaryPath();
    if (!binaryPath) {
      return null;
    }

    const oauth2FilePath = findGeminiOauth2FilePath(binaryPath);
    if (!oauth2FilePath) {
      return null;
    }

    return fs.readFileSync(oauth2FilePath, "utf-8");
  } catch {
    return null;
  }
}

export function extractGeminiOAuthClientCredentials(content: string): GeminiOAuthClientCredentials | null {
  const clientIdMatch = content.match(/OAUTH_CLIENT_ID\s*=\s*["']([^"']+)["']/);
  const clientSecretMatch = content.match(/OAUTH_CLIENT_SECRET\s*=\s*["']([^"']+)["']/);

  if (!clientIdMatch || !clientSecretMatch) {
    return null;
  }

  return {
    clientId: clientIdMatch[1],
    clientSecret: clientSecretMatch[1],
  };
}

function resolveGeminiOAuthClientCredentialsFromEnv(): GeminiOAuthClientCredentials | null {
  const clientId = cleanString(process.env[GEMINI_OAUTH_CLIENT_ID_ENV_KEY]);
  const clientSecret = cleanString(process.env[GEMINI_OAUTH_CLIENT_SECRET_ENV_KEY]);

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

export function resolveGeminiOAuthClientCredentials(
  content: string | null | undefined,
): GeminiOAuthClientCredentials | null {
  if (content) {
    const extractedCredentials = extractGeminiOAuthClientCredentials(content);
    if (extractedCredentials) {
      return extractedCredentials;
    }
  }

  return resolveGeminiOAuthClientCredentialsFromEnv();
}

export function resolveGeminiOAuthClientCredentialsFromLocal(): GeminiOAuthClientCredentials | null {
  const oauth2Content = readGeminiOauth2FileContent();
  return resolveGeminiOAuthClientCredentials(oauth2Content);
}

export function resolveGeminiAuthType(settings: GeminiSettings | null): string {
  return cleanString(settings?.authType) ?? cleanString(settings?.security?.auth?.selectedType) ?? "oauth-personal";
}
