import { LocalStorage } from "@raycast/api";
import { spawnSync } from "child_process";

const PASSWORD_KEY = "sudo_password";

export async function getSavedPassword(): Promise<string | undefined> {
  console.log("[AUTH] Retrieving saved password from LocalStorage");
  const password = await LocalStorage.getItem<string>(PASSWORD_KEY);
  console.log(`[AUTH] Password ${password ? "found" : "not found"} in storage`);
  return password;
}

export async function savePassword(password: string): Promise<void> {
  console.log("[AUTH] Saving password to LocalStorage");
  await LocalStorage.setItem(PASSWORD_KEY, password);
  console.log("[AUTH] Password saved successfully");
}

export async function clearPassword(): Promise<void> {
  console.log("[AUTH] Clearing saved password");
  await LocalStorage.removeItem(PASSWORD_KEY);
  console.log("[AUTH] Password cleared");
}

export function validatePassword(password: string): boolean {
  console.log("[AUTH] Validating password with sudo test");
  try {
    // Use spawn to safely pass password via stdin instead of command interpolation
    const result = spawnSync("/usr/bin/sudo", ["-S", "/usr/bin/true"], {
      input: password + "\n",
      encoding: "utf-8",
      timeout: 5000,
      env: {
        ...process.env,
        PATH: "/usr/local/bin:/usr/bin:/bin",
      },
    });

    console.log("[AUTH] Password validation command executed");
    console.log("[AUTH] Exit code:", result.status);

    if (result.stdout) {
      console.log("[AUTH] Validation stdout:", result.stdout);
    }
    if (result.stderr) {
      console.error("[AUTH] Validation stderr:", result.stderr);
    }

    // Check if password was accepted (exit code 0)
    if (result.status === 0) {
      console.log("[AUTH] Password validation successful");
      return true;
    }

    // Check for incorrect password errors
    const stderr = result.stderr || "";
    if (stderr.includes("Sorry") || stderr.includes("incorrect password")) {
      console.log("[AUTH] Password is incorrect");
      return false;
    }

    console.error(
      "[AUTH] Password validation failed with status:",
      result.status,
    );
    return false;
  } catch (error: any) {
    console.error("[AUTH] Password validation exception:", error.message);
    return false;
  }
}

export async function executeWithSudo(
  command: string,
  args: string[],
  password?: string,
): Promise<string> {
  console.log("[AUTH] Executing command with sudo:", command);
  console.log("[AUTH] Arguments:", args.join(" "));

  // Get password from parameter or storage
  const pwd = password || (await getSavedPassword());

  if (!pwd) {
    console.error("[AUTH] No password available for sudo execution");
    throw new Error("Password required for this operation");
  }

  console.log("[AUTH] Password available, executing command");

  try {
    // Use spawn to safely pass password via stdin
    const result = spawnSync("/usr/bin/sudo", ["-S", command, ...args], {
      input: pwd + "\n",
      encoding: "utf-8",
      timeout: 60000,
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
      },
    });

    console.log("[AUTH] Command executed");
    console.log("[AUTH] Exit code:", result.status);

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";

    if (stdout.length > 0) {
      console.log("[AUTH] stdout length:", stdout.length);
      console.log("[AUTH] stdout preview:", stdout.substring(0, 200));
    }
    if (stderr.length > 0) {
      console.error("[AUTH] stderr:", stderr.substring(0, 200));
    }

    // Check for password errors
    if (
      stderr.includes("Sorry, try again") ||
      stderr.includes("incorrect password") ||
      stderr.includes("Sorry")
    ) {
      console.log("[AUTH] Invalid password detected, clearing saved password");
      await clearPassword();
      throw new Error("Invalid password. Please try again.");
    }

    // If command succeeded or returned output, return it
    if (result.status === 0 || stdout.length > 0) {
      console.log("[AUTH] Command executed successfully");
      return stdout;
    }

    // Command failed
    const error = new Error(`Command failed with exit code ${result.status}`);
    throw error;
  } catch (error: any) {
    console.error("[AUTH] Command execution exception:", error.message);
    throw error;
  }
}
