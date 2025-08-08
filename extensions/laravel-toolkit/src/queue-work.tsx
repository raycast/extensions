import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import { findLaravelProjectRoot } from "../lib/projectLocator";
import { getPhpPath } from "../lib/phpLocator";

const execAsync = promisify(exec);

export default function QueueWork() {
  const [proc, setProc] = useState<ChildProcessWithoutNullStreams | null>(null);
  const [output, setOutput] = useState<string>("");

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

    if (proc) {
      await showToast({ style: Toast.Style.Failure, title: "Worker already running" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Starting Queue Worker…" });

    const php = await getPhpPath();
    const child = spawn(php, ["artisan", "queue:work"], { cwd });

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
    const command = 'cd "' + cwd + '" && "' + php + '" artisan queue:work';
    await execAsync('osascript -e \'tell application "Terminal" to do script "' + command.replace(/"/g, '\\"') + "\"'");
  }

  return (
    <Detail
      markdown={`\`\`\`\n${output || "php artisan queue:work"}\n\`\`\``}
      actions={
        <ActionPanel>
          {proc ? <Action title="Stop Worker" onAction={stop} /> : <Action title="Start Worker" onAction={start} />}
          <Action title="Start in Terminal" onAction={openInTerminal} />
        </ActionPanel>
      }
    />
  );
}
