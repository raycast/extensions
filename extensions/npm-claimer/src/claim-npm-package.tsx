import { Action, ActionPanel, Form, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import { execSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir, homedir } from "os";
import { join } from "path";

const placeholderDescriptions = [
  "This package name is reserved for future use",
  "Coming soon - stay tuned!",
  "Reserved. Something amazing is brewing...",
  "Claimed and ready for greatness",
  "Placeholder for an upcoming project",
  "Reserved by a developer with big plans",
  "Work in progress - check back later",
  "The next big thing starts here",
  "Reserved for future awesomeness",
  "Under construction - great things ahead",
];

function getRandomDescription(): string {
  return placeholderDescriptions[Math.floor(Math.random() * placeholderDescriptions.length)];
}

function findNodeBinDir(): string | null {
  const paths = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/opt/homebrew/opt/node/bin",
    "/opt/homebrew/opt/node@24/bin",
    "/opt/homebrew/opt/node@22/bin",
    "/opt/homebrew/opt/node@20/bin",
    join(homedir(), ".nvm/current/bin"),
    join(homedir(), ".volta/bin"),
  ];

  for (const p of paths) {
    if (existsSync(join(p, "npm"))) return p;
  }

  return null;
}

export default function Command() {
  async function handleSubmit(values: { packageName: string; otp?: string }) {
    const { packageName, otp } = values;

    if (!packageName.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Package name is required" });
      return;
    }

    const { npmToken } = getPreferenceValues<Preferences>();

    const toast = await showToast({ style: Toast.Style.Animated, title: "Claiming package...", message: packageName });

    let tempDir: string | null = null;

    try {
      tempDir = mkdtempSync(join(tmpdir(), "npm-claim-"));

      const packageJson = {
        name: packageName.trim(),
        version: "0.0.1-alpha.1",
        description: getRandomDescription(),
        main: "index.js",
        license: "MIT",
      };

      writeFileSync(join(tempDir, "package.json"), JSON.stringify(packageJson, null, 2));
      writeFileSync(join(tempDir, "index.js"), "// placeholder\n");
      writeFileSync(join(tempDir, ".npmrc"), "//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n");

      const nodeBinDir = findNodeBinDir();
      const envPath = nodeBinDir ? `${nodeBinDir}:${process.env.PATH || ""}` : process.env.PATH;

      const otpFlag = otp?.trim() ? ` --otp=${otp.trim()}` : "";
      execSync(`npm publish --access public --tag reserved${otpFlag}`, {
        cwd: tempDir,
        stdio: "pipe",
        env: {
          ...process.env,
          PATH: envPath,
          NPM_TOKEN: npmToken,
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Package claimed!";
      toast.message = `${packageName}@0.0.1-alpha.1 published`;

      await popToRoot();
    } catch (error) {
      const err = error as { stderr?: Buffer; stdout?: Buffer; message?: string };
      const stderr = err.stderr?.toString() || "";
      const stdout = err.stdout?.toString() || "";
      const output = stderr + stdout;

      toast.style = Toast.Style.Failure;
      toast.title = "Failed to claim package";

      if (output.includes("EOTP") || output.includes("one-time pass")) {
        toast.message = "OTP code required or invalid";
      } else if (
        output.includes("403") ||
        output.includes("forbidden") ||
        output.includes("You do not have permission")
      ) {
        toast.message = "Package name is taken or restricted";
      } else if (output.includes("401") || output.includes("unauthorized") || output.includes("Not authenticated")) {
        toast.message = "Invalid npm token";
      } else if (output.includes("already exists")) {
        toast.message = "Package already exists";
      } else {
        const lines = output.split("\n").filter((l) => l.includes("error") || l.includes("ERR!"));
        toast.message = lines[0]?.slice(0, 100) || err.message?.slice(0, 100) || "Unknown error";
      }
    } finally {
      if (tempDir) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Claim Package" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="packageName"
        title="Package Name"
        placeholder="my-awesome-package"
        info="The npm package name you want to claim"
      />
      <Form.TextField
        id="otp"
        title="OTP Code"
        placeholder="123456"
        info="One-time password from your authenticator app (required if 2FA is enabled)"
      />
    </Form>
  );
}
