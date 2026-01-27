import { homedir } from "os";
import { join } from "path";
import * as fs from "fs";

export function debugCodexAuth(): { found: boolean; paths: string[]; error?: string } {
  const paths = [
    join(homedir(), ".codex", "auth.json"),
    join(homedir(), ".codex", "credentials.json"),
    join(homedir(), ".config", "codex", "auth.json"),
  ];
  
  const results: string[] = [];
  
  for (const path of paths) {
    const exists = fs.existsSync(path);
    let hasToken = false;
    let error = null;
    
    if (exists) {
      try {
        const data = JSON.parse(fs.readFileSync(path, "utf-8"));
        hasToken = !!data.access_token;
        results.push(`${path}: EXISTS (has_token: ${hasToken})`);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        results.push(`${path}: EXISTS (parse error: ${error})`);
      }
    } else {
      results.push(`${path}: NOT FOUND`);
    }
  }
  
  return {
    found: results.some(r => r.includes("has_token: true")),
    paths: results,
  };
}

export function validateKimiToken(token: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!token || token.trim().length === 0) {
    issues.push("Token is empty");
    return { valid: false, issues };
  }
  
  // Check if it looks like a JWT (has 3 parts separated by dots)
  const parts = token.split(".");
  if (parts.length !== 3) {
    issues.push(`Token doesn't look like a JWT (has ${parts.length} parts, expected 3)`);
  }
  
  // Check if it has Bearer prefix (user might have included it)
  if (token.toLowerCase().startsWith("bearer ")) {
    issues.push("Token includes 'Bearer ' prefix - this will be added automatically");
  }
  
  // Check length (JWTs are typically long)
  if (token.length < 50) {
    issues.push("Token seems too short for a JWT");
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
