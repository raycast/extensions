import { ActionPanel, CopyToClipboardAction, List, PasteAction, getPreferenceValues } from "@raycast/api";
import * as changeCase from "change-case-all";
import { execa } from "execa";
import { useEffect, useState } from "react";

type CaseType =
  | "Camel Case"
  | "Capital Case"
  | "Constant Case"
  | "Dot Case"
  | "Header Case"
  | "Kebab Case"
  | "Lower Case"
  | "Lower First"
  | "Macro Case"
  | "No Case"
  | "Param Case"
  | "Pascal Case"
  | "Path Case"
  | "Random Case"
  | "Sentence Case"
  | "Snake Case"
  | "Swap Case"
  | "Title Case"
  | "Upper Case"
  | "Upper First";

async function runShellScript(command: string) {
  const { stdout } = await execa(command, {
    env: { LC_CTYPE: "UTF-8" },
  });
  return stdout;
}

async function readClipboard() {
  return await runShellScript("pbpaste");
}

export default function changeChase() {
  const data: { type: CaseType; func: (input: string, options?: object) => string }[] = [
    { type: "Camel Case", func: changeCase.camelCase },
    { type: "Capital Case", func: changeCase.capitalCase },
    { type: "Constant Case", func: changeCase.constantCase },
    { type: "Dot Case", func: changeCase.dotCase },
    { type: "Header Case", func: changeCase.headerCase },
    { type: "Kebab Case", func: changeCase.paramCase },
    { type: "Lower Case", func: changeCase.lowerCase },
    { type: "Lower First", func: changeCase.lowerCaseFirst },
    { type: "Macro Case", func: changeCase.constantCase },
    { type: "No Case", func: changeCase.noCase },
    { type: "Param Case", func: changeCase.paramCase },
    { type: "Pascal Case", func: changeCase.pascalCase },
    { type: "Path Case", func: changeCase.pathCase },
    { type: "Random Case", func: changeCase.spongeCase },
    { type: "Sentence Case", func: changeCase.sentenceCase },
    { type: "Snake Case", func: changeCase.snakeCase },
    { type: "Swap Case", func: changeCase.swapCase },
    { type: "Title Case", func: changeCase.titleCase },
    { type: "Upper Case", func: changeCase.upperCase },
    { type: "Upper First", func: changeCase.upperCaseFirst },
  ];

  const [clipboard, setClipboard] = useState<string>("");
  useEffect(() => {
    readClipboard().then((c) => setClipboard(c));
  });

  const preferences = getPreferenceValues();

  return (
    <List>
      {data.map((d) => {
        const modified = d.func(clipboard);
        if (preferences[d.type.replace(/ +/g, "")] !== true) return;
        return (
          <List.Item
            key={d.type}
            id={d.type}
            title={d.type}
            subtitle={modified}
            actions={
              <ActionPanel>
                <CopyToClipboardAction title="Copy to Clipboard" content={modified} />
                <PasteAction title="Paste in Frontmost App" content={modified} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
