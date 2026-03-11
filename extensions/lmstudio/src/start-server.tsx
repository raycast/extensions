import { Detail, ActionPanel, Action, Color, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const LMS = `"%USERPROFILE%\\.lmstudio\\bin\\lms.exe"`;

type Status = "loading" | "success" | "error";

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:1234/v1/models");
    return response.ok;
  } catch {
    return false;
  }
}

async function startServer(): Promise<void> {
  await execAsync(`cmd /c start "" /b ${LMS} server start`);
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await checkServerRunning()) return;
  }
  throw new Error("Server did not start in time");
}

async function loadModel(model: string): Promise<void> {
  await execAsync(`${LMS} load "${model}" --yes`);
}

export default function Command(props: { arguments: Arguments.StartServer }) {
  const { model } = props.arguments;
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Checking LM Studio server...");
  const [steps, setSteps] = useState<string[]>([]);
  const hasRun = useRef(false);

  function addStep(step: string) {
    setSteps((prev) => [...prev, step]);
  }

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function run() {
      try {
        const running = await checkServerRunning();

        if (!running) {
          setMessage("Starting LM Studio server...");
          addStep("⏳ Server not detected, starting...");
          await startServer();
          addStep("✅ Server started");
        } else {
          addStep("✅ Server already running");
        }

        setMessage(`Loading model \`${model}\`...`);
        addStep(`⏳ Loading \`${model}\`...`);
        await loadModel(model);
        addStep(`✅ Model \`${model}\` loaded`);

        setStatus("success");
        setMessage(`Ready! Model \`${model}\` is loaded on \`localhost:1234\`.`);
      } catch (err) {
        setStatus("error");
        setMessage(
          `**Error:** ${err instanceof Error ? err.message : String(err)}\n\n` +
            `Please check that:\n- LM Studio has been launched at least once\n- The \`lms\` CLI is installed (\`%USERPROFILE%\\.lmstudio\\bin\\lms.exe\`)\n- The model identifier is correct (use \`lms ls\` to list available models)`,
        );
        addStep("❌ Failed");
      }
    }

    run();
  }, []);

  const markdown =
    `## ${status === "loading" ? "⏳ Starting..." : status === "success" ? "✅ Server Ready" : "❌ Error"}\n\n` +
    `${steps.map((s) => `- ${s}`).join("\n")}\n\n` +
    (status !== "loading" ? `---\n\n${message}` : "");

  return (
    <Detail
      isLoading={status === "loading"}
      markdown={markdown}
      metadata={
        status === "success" ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Status"
              text="Online"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
            <Detail.Metadata.Label title="Model" text={model} />
            <Detail.Metadata.Label title="Address" text="http://localhost:1234" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        status === "error" ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open LM Studio" url="lmstudio://" />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
