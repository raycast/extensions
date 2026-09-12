import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { CodeLanguage } from "@daytona/sdk";
import { useState } from "react";
import { setToastFailure, startDaytonaAnimatedToast } from "./daytona-toast";

type FormValues = {
  code: string;
};

function RunResultDetail(props: { language: string; sandboxId: string; exitCode: number; output: string }) {
  const outputBlock = props.output.trim().length > 0 ? props.output : "(no output)";

  return (
    <Detail
      markdown={[
        "# Execution Result",
        "",
        `- Language: \`${props.language}\``,
        `- Sandbox ID: \`${props.sandboxId}\``,
        `- Exit Code: \`${props.exitCode}\``,
        "",
        "## Output",
        "```",
        outputBlock,
        "```",
      ].join("\n")}
    />
  );
}

export default function RunCodeCommand() {
  const { push } = useNavigation();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<CodeLanguage>(CodeLanguage.PYTHON);

  function detectCodeLanguage(input: string): CodeLanguage | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const tsPatterns = [
      /\binterface\s+[A-Z]\w*/m,
      /\btype\s+[A-Z]\w*\s*=/m,
      /\bimplements\s+[A-Z]\w*/m,
      /:\s*(string|number|boolean|unknown|any|void|never|Record<|Array<)/m,
      /\bas\s+const\b/m,
      /\bsatisfies\b/m,
    ];
    if (tsPatterns.some((pattern) => pattern.test(trimmed))) {
      return CodeLanguage.TYPESCRIPT;
    }

    const pythonPatterns = [
      /^\s*def\s+\w+\s*\(/m,
      /^\s*class\s+\w+\s*[:(]/m,
      /^\s*from\s+\w+(\.\w+)*\s+import\s+/m,
      /^\s*import\s+\w+(\.\w+)*/m,
      /\bif\s+__name__\s*==\s*["']__main__["']\s*:/m,
      /^\s*print\(.+\)\s*$/m,
    ];
    if (pythonPatterns.some((pattern) => pattern.test(trimmed))) {
      return CodeLanguage.PYTHON;
    }

    const jsPatterns = [
      /\b(const|let|var)\s+\w+\s*=/m,
      /\bfunction\s+\w+\s*\(/m,
      /\b(console\.log|require\(|module\.exports)\b/m,
    ];
    if (jsPatterns.some((pattern) => pattern.test(trimmed))) {
      return CodeLanguage.JAVASCRIPT;
    }

    return null;
  }

  function handleCodeChange(nextCode: string) {
    setCode(nextCode);

    const detectedLanguage = detectCodeLanguage(nextCode);
    if (detectedLanguage && detectedLanguage !== language) {
      setLanguage(detectedLanguage);
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!values.code.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Code is required",
      });
      return;
    }

    const { daytona, toast } = await startDaytonaAnimatedToast("Running code in sandbox");

    let sandbox: Awaited<ReturnType<typeof daytona.create>> | undefined;

    try {
      sandbox = await daytona.create({
        language,
      });

      const response = await sandbox.process.codeRun(values.code);

      toast.style = Toast.Style.Success;
      toast.title = "Code executed";
      toast.message = `Exit code ${response.exitCode}`;

      push(
        <RunResultDetail
          language={language}
          sandboxId={sandbox.id}
          exitCode={response.exitCode}
          output={response.result}
        />,
      );
    } catch (error) {
      setToastFailure(toast, "Execution failed", error);
    } finally {
      if (sandbox) {
        try {
          await sandbox.delete();
        } catch {
          // Ignore cleanup errors for this quick-run command.
        }
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Code" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="code"
        title="Code Snippet"
        placeholder="Paste code to execute"
        value={code}
        onChange={handleCodeChange}
      />
      <Form.Dropdown
        id="language"
        title="Language"
        value={language}
        onChange={(value) => setLanguage(value as CodeLanguage)}
      >
        <Form.Dropdown.Item title="Python" value={CodeLanguage.PYTHON} />
        <Form.Dropdown.Item title="TypeScript" value={CodeLanguage.TYPESCRIPT} />
        <Form.Dropdown.Item title="JavaScript" value={CodeLanguage.JAVASCRIPT} />
      </Form.Dropdown>
    </Form>
  );
}
