import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { getPhpPath } from "../lib/phpLocator";
import { formatProjectInfo } from "../lib/projectDisplay";

const execAsync = promisify(exec);

export default function Serve() {
  const [proc, setProc] = useState<ChildProcessWithoutNullStreams | null>(null);
  const [output, setOutput] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (proc) {
        proc.kill();
      }
    };
  }, [proc]);

  async function start() {
    const cwd = await findLaravelProjectRoot();
    if (!cwd) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Laravel Project Found",
        message: "Please add a Laravel project first",
      });
      return;
    }
    setProjectPath(cwd);

    if (proc) {
      await showToast({ style: Toast.Style.Failure, title: "Server already running" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Starting Server…" });

    const php = await getPhpPath();
    const child = spawn(php, ["artisan", "serve"], { cwd });

    child.stdout.on("data", (d) => setOutput((prev) => prev + d.toString()));
    child.stderr.on("data", (d) => setOutput((prev) => prev + d.toString()));
    child.on("close", (code) => {
      setOutput((prev) => prev + `\nProcess exited with code ${code}\n`);
      setProc(null);
    });

    setProc(child);
  }

  function stop() {
    if (proc) {
      proc.kill();
      setProc(null);
    }
  }

  async function openInTerminal() {
    const cwd = await findLaravelProjectRoot();
    if (!cwd) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Laravel Project Found",
        message: "Please add a Laravel project first",
      });
      return;
    }
    const php = await getPhpPath();
    const command = 'cd "' + cwd + '" && "' + php + '" artisan serve';
    await execAsync('osascript -e \'tell application "Terminal" to do script "' + command.replace(/"/g, '\\"') + "\"'");
  }

  const projectInfo = projectPath ? formatProjectInfo(projectPath) : "";
  const title = projectPath ? `Development Server - ${projectInfo}` : "Development Server";

  return (
    <Detail
      markdown={`\`\`\`\n${output || "php artisan serve"}\n\`\`\``}
      navigationTitle={title}
      actions={
        <ActionPanel>
          {proc ? <Action title="Stop Server" onAction={stop} /> : <Action title="Start Server" onAction={start} />}
          <Action title="Start in Terminal" onAction={openInTerminal} />
        </ActionPanel>
      }
    />
  );
}
