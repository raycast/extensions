import {
  ActionPanel,
  List,
  getPreferenceValues,
  getSelectedText,
  Action,
  Icon,
  Clipboard,
  showHUD,
  closeMainWindow,
  showToast,
  Toast,
  getFrontmostApplication,
} from "@raycast/api";
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
  | "Upper First"
  | "Sponge Case";

async function runShellScript(command: string) {
  const { stdout } = await execa(command, {
    env: { LC_CTYPE: "UTF-8" },
  });
  return stdout;
}

class NoTextError extends Error {
  constructor() {
    super("No text");

    Object.setPrototypeOf(this, NoTextError.prototype);
  }
}

async function getSelection() {
  try {
    return await getSelectedText();
  } catch (error) {
    return "";
  }
}

async function readContent(preferredSource: string) {
  if (preferredSource === "clipboard") {
    const clipboard = await runShellScript("pbpaste");
    if (clipboard.length > 0) return clipboard;
    const selection = await getSelection();
    if (selection.length > 0) return selection;
    throw new NoTextError();
  } else {
    const selection = await getSelection();
    if (selection.length > 0) return selection;
    const clipboard = await runShellScript("pbpaste");
    if (clipboard.length > 0) return clipboard;
    throw new NoTextError();
  }
}

export default function Command() {
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
    { type: "Sponge Case", func: changeCase.spongeCase },
  ];

  const [clipboard, setClipboard] = useState<string>("");
  const [frontmostAppName, setFrontmostAppName] = useState<string>("Active App");

  const preferences = getPreferenceValues();
  const preferredSource = preferences["source"];

  useEffect(() => {
    (async () => {
      const { name } = await getFrontmostApplication();
      setFrontmostAppName(name);
    })();
  }, []);

  useEffect(() => {
    readContent(preferredSource)
      .then((c) => setClipboard(c))
      .catch((error) => {
        if (error instanceof NoTextError) {
          showToast({
            style: Toast.Style.Failure,
            title: "Nothing to convert",
            message: "Please ensure that text is either selected or copied",
          });
        }
      });
  }, [preferredSource]);

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
                <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => copyToClipboard(modified)} />
                <Action
                  title={`Paste in ${frontmostAppName}`}
                  icon={Icon.BlankDocument}
                  onAction={() => paste(modified, frontmostAppName)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export async function copyToClipboard(content: string) {
  await showHUD("Copied to Clipboard");
  await Clipboard.copy(content);
  await closeMainWindow();
}

export async function paste(content: string, appName: string) {
  await showHUD(`Pasted in ${appName}`);
  await Clipboard.paste(content);
  await closeMainWindow();
}
