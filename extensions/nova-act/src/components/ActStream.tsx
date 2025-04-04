import { LocalStorage, showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";
import path from "path";
import { useEffect, useRef, useState } from "react";
import RunDetails, { maybeParseSessionId } from "./RunDetails";
import { ActRun } from "./PastRuns";
import { findPythonInterpreter } from "./utils";

interface ActStreamProps {
  apiKey: string;
  prompt: string;
  startingPage?: string;
  returnSchema?: string;
  headless: boolean;
  recordBrowser: boolean;
}

export default function ActStream({
  apiKey,
  prompt,
  startingPage,
  returnSchema,
  headless,
  recordBrowser,
}: ActStreamProps) {
  const [logs, setLogs] = useState<string>("");
  const [error, setError] = useState<string>("");
  const pythonProcessRef = useRef<ReturnType<typeof spawn> | null>(null);
  const hasSpawned = useRef(false);
  const logsRef = useRef<string>(""); // Keeps track of the current logs so on python's process close, we can parse return values

  function stopActRun() {
    if (pythonProcessRef.current && pythonProcessRef.current.stdin) {
      pythonProcessRef.current.stdin.write("\x18"); // \x18 is ASCII for Control+X, which is used to cancel an act() run
    }
  }

  async function saveCurrentRunToStorage(logs: string) {
    const sessionId = maybeParseSessionId(logs);
    if (sessionId === undefined) {
      return;
    }
    const runToStore: ActRun = {
      id: sessionId,
      prompt: prompt,
      logs,
      date: new Date().toISOString(),
    };

    let existingRuns: ActRun[] = [];
    try {
      const storedJson = await LocalStorage.getItem<string>("pastRuns");
      existingRuns = storedJson ? JSON.parse(storedJson) : [];
    } catch {
      // ignore parse errors, assume empty
    }

    // Find the existing run with the same id
    const existingRun = existingRuns.find((run) => run.id === sessionId);
    if (existingRun !== undefined) {
      // If we found an existing run, update it
      existingRun.logs = logs;
    } else {
      // Otherwise, add it to the list
      existingRuns.push(runToStore);
    }
    await LocalStorage.setItem("pastRuns", JSON.stringify(existingRuns));
  }

  function updateLogs(newLogs: string) {
    const newLogsToSet = logsRef.current + newLogs;
    setLogs(newLogsToSet);
    logsRef.current = newLogsToSet;

    // Also update local storage
    saveCurrentRunToStorage(newLogsToSet);
  }

  useEffect(() => {
    // Don't spawn another if we're already running a process
    if (hasSpawned.current) return;
    hasSpawned.current = true;

    (async () => {
      try {
        const pythonPath = await findPythonInterpreter();

        const env = {
          ...process.env,
          NOVA_ACT_API_KEY: apiKey,
        };

        const scriptPath = path.resolve(__dirname, "assets/scripts/nova_act_runner.py");
        const args = ["-u", scriptPath, prompt];
        args.push("--headless", headless.toString());
        args.push("--record-browser", recordBrowser.toString());

        if (startingPage) {
          args.push("--starting-page", startingPage);
        }
        if (returnSchema) {
          args.push("--return-schema", returnSchema);
        }

        const spawned = spawn(pythonPath, args, { env });
        pythonProcessRef.current = spawned;

        spawned.stdout.on("data", (data) => {
          updateLogs(data);
        });

        spawned.stderr.on("data", (data) => {
          updateLogs(data);
        });

        spawned.on("close", (code) => {
          pythonProcessRef.current = null;
          if (code == null) {
            return;
          }

          if (code !== 0) {
            setError(`Process exited with code ${code}`);
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError(String(error));
        }
      }
    })();

    return () => {
      if (pythonProcessRef.current) {
        pythonProcessRef.current.kill();
        pythonProcessRef.current = null;
      }
    };
  }, []);

  if (error) {
    showToast({
      title: "Error",
      message: error,
      style: Toast.Style.Failure,
    });
  }

  return <RunDetails logs={logs} stopCurrentActRun={stopActRun} />;
}
