import { closeMainWindow, Detail, popToRoot, PopToRootType } from "@raycast/api";
import { useMemo, useState } from "react";
import { runWithoutWindow } from "../commands/headless";
import type { RunInput } from "../commands/input";
import type { PromptDef } from "../core/types";
import { extractRequirements } from "../prompts/template/render";
import { guarded } from "./feedback";
import { ResultView } from "./result-view";
import { ArgumentForm } from "./simple-forms";
import { useRunOnce } from "./use-run-once";

/** Prompts with arguments arrive here even without a preview. Once the form is done, the window has to go. */
function WindowlessRun({ prompt, input, args }: { prompt: PromptDef; input: RunInput; args: Record<string, string> }) {
  useRunOnce(
    guarded("Cannot Run Prompt", async () => {
      // Suspended keeps this command alive after the window closes; the paste needs the source app in front.
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
      const handedOver = await runWithoutWindow(prompt, input, args, { keepLoaded: true });
      // After a handover the session window is showing, and popping would close it again.
      if (!handedOver) await popToRoot();
    }),
  );
  return <Detail isLoading markdown="" />;
}

interface RunSessionProps {
  prompt: PromptDef;
  input: RunInput;
  /** Values from an earlier attempt of this run. */
  initialArgs?: Record<string, string>;
  forcePreview?: boolean;
  /** Only for a pushed view. Raycast's guidelines keep the title of a command's root view unchanged. */
  navigationTitle?: string;
}

export function RunSession({ prompt, input, initialArgs, forcePreview = false, navigationTitle }: RunSessionProps) {
  const fields = useMemo(() => extractRequirements(prompt.template).arguments, [prompt.template]);
  const [args, setArgs] = useState(initialArgs ?? (fields.length === 0 ? {} : undefined));

  if (!args) {
    return (
      <ArgumentForm promptName={prompt.name} navigationTitle={navigationTitle} fields={fields} onSubmit={setArgs} />
    );
  }
  if (prompt.output !== "preview" && !forcePreview) return <WindowlessRun prompt={prompt} input={input} args={args} />;
  return <ResultView prompt={prompt} input={input} args={args} navigationTitle={navigationTitle} />;
}
