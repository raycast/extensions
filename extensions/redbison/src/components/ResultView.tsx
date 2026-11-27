import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useState } from "react";
import {
  cliCommand,
  codeBlock,
  concealCommand,
  concealResult,
  languageFor,
  optionLabel,
  runUtility,
  UtilityError,
  type Options,
  type Utility,
} from "../lib/utilities";
import type { Input } from "../lib/input";
import { shortcut } from "../lib/shortcuts";
import { OptionsForm } from "./OptionsForm";

type Outcome = { ok: true; output: string } | { ok: false; message: string };

function attempt(u: Utility, input: Input, options: Options): Outcome {
  try {
    return { ok: true, output: runUtility(u.id, u.generates ? "" : input.text, options) };
  } catch (e) {
    if (e instanceof UtilityError) return { ok: false, message: e.message };
    return { ok: false, message: `Something went wrong inside ${u.title}: ${(e as Error).message}` };
  }
}

export function ResultView({ utility: u, input, options }: { utility: Utility; input: Input; options: Options }) {
  // Run once per view; Generate Again reruns it, since generators (UUID,
  // password, random numbers) answer differently each time.
  const [outcome, setOutcome] = useState(() => attempt(u, input, options));
  const command = cliCommand(u.id, options);

  const markdown = outcome.ok
    ? `## ${u.title}\n\n${codeBlock(outcome.output, languageFor(u.id, outcome.output))}`
    : `## ${u.title} could not run\n\n${codeBlock(outcome.message)}`;

  return (
    <Detail
      navigationTitle={u.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Utility" text={u.title} />
          {u.generates ? null : (
            <Detail.Metadata.Label
              title="Input"
              text={`${input.source}, ${input.text.length.toLocaleString("en-US")} characters`}
            />
          )}
          {outcome.ok ? (
            <Detail.Metadata.Label
              title="Result"
              text={`${outcome.output.length.toLocaleString("en-US")} characters`}
            />
          ) : null}
          {Object.entries(options).map(([key, value]) => {
            const spec = u.options.find((o) => o.key === key);
            return (
              <Detail.Metadata.Label
                key={key}
                title={spec ? optionLabel(spec) : key}
                text={String(value).length > 60 ? `${String(value).slice(0, 57)}...` : String(value)}
              />
            );
          })}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Runs" text="On this computer, nothing sent" icon={Icon.Lock} />
          <Detail.Metadata.Link title="On the Web" target={u.url} text={new URL(u.url).pathname.slice(1)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {outcome.ok ? (
            <ActionPanel.Section>
              {/* A generated password stays out of Clipboard History. */}
              <Action.CopyToClipboard title="Copy Result" content={outcome.output} concealed={concealResult(u.id)} />
              <Action.Paste title="Paste Result" content={outcome.output} />
              {u.generates ? (
                <Action
                  title="Generate Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={shortcut("r")}
                  onAction={() => setOutcome(attempt(u, input, options))}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.Push
              title="Change Options"
              icon={Icon.Pencil}
              shortcut={shortcut("e")}
              target={<OptionsForm utility={u} input={input} initialOptions={options} />}
            />
            <Action.OpenInBrowser title="Open on RedBison" url={u.url} shortcut={shortcut("o")} />
            <Action.CopyToClipboard
              title="Copy CLI Command"
              icon={Icon.Terminal}
              content={command}
              concealed={concealCommand(u.id, options)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
