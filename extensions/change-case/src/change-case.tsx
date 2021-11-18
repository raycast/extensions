import { ActionPanel, CopyToClipboardAction, List, PasteAction } from "@raycast/api";
import * as changeCase from "change-case";
import execa from "execa";
import { useEffect, useState } from "react";

async function runShellScript(command: string) {
  const { stdout } = await execa.command(command, {
    env: { LC_CTYPE: "UTF-8" }
  });
  return stdout;
}

async function readClipboard() {
  return await runShellScript("pbpaste");
}

export default function changeChase() {
  const data = [
    { label: "Camel Case", func: changeCase.camel },
    { label: "Constant Case", func: changeCase.constant },
    { label: "Macro Case", func: changeCase.constant },
    { label: "Dot Case", func: changeCase.dot },
    { label: "Kebab Case", func: changeCase.param },
    { label: "Lower Case", func: changeCase.lower },
    { label: "Lower First", func: changeCase.lcFirst },
    { label: "No Case", func: changeCase.no },
    { label: "Param Case", func: changeCase.param },
    { label: "Pascal Case", func: changeCase.pascal },
    { label: "Path Case", func: changeCase.path },
    { label: "Sentence Case", func: changeCase.sentence },
    { label: "Snake Case", func: changeCase.snake },
    { label: "Swap Case", func: changeCase.swap },
    { label: "Title Case", func: changeCase.title },
    { label: "Upper Case", func: changeCase.upper },
    { label: "Upper First ", func: changeCase.ucFirst }
  ];

  const [clipboard, setClipboard] = useState<string>();
  useEffect(() => {
    readClipboard().then((clipboard) => setClipboard(clipboard));
  });

  return (
    <List isLoading={!clipboard}>
      {
        data.map((d) => {
          const modified = d.func(clipboard ?? "");
          console.log(modified);
          return (
            <List.Item
              key={d.label}
              id={d.label}
              title={d.label}
              subtitle={modified}
              actions={
                <ActionPanel>
                  <CopyToClipboardAction title="Copy to Clipboard" content={modified} />
                  <PasteAction title="Paste in Frontmost App" content={modified} />
                </ActionPanel>
              }
            />
          );
        })
      }
    </List>
  );
}
