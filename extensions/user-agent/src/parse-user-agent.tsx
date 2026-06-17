import { Action, ActionPanel, Detail, Toast, getSelectedText, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import UAParser from "ua-parser-js";

function filteredWords(...words: (string | undefined | boolean)[]) {
  return words.filter(Boolean).join(" ");
}

function filteredLines(...lines: (string | undefined | boolean)[]) {
  return lines.filter((line) => typeof line === "string").join("\n");
}

function hasContent<T extends object>(obj: T) {
  return Object.values(obj).some(Boolean);
}

function bold(text: string) {
  return `**${text}**`;
}

function section(title: string, content: string) {
  return ["", title, "", content, ""].join("\n");
}

function renderMarkdown(parserResult: UAParser.IResult) {
  const { browser, cpu, device, ua, engine, os } = parserResult;
  const isEmpty = Object.entries(parserResult)
    .filter(([key]) => key !== "ua")
    .every(([, value]) => !hasContent(value));

  return filteredLines(
    hasContent(device) && section("Device", bold(filteredWords(device.vendor, device.model, device.type))),
    hasContent(os) && section("OS", bold(filteredWords(os.name, os.version))),
    hasContent(browser) && section("Browser", bold(filteredWords(browser.name, browser.version))),
    hasContent(engine) && section("Browser Engine", bold(filteredWords(engine.name, engine.version))),
    hasContent(cpu) && section("CPU Architecture", bold(filteredWords(cpu.architecture))),
    section("From Selected Text", "`" + ua + "`"),
    isEmpty && "Empty user agent",
  );
}

export default function CheckUserAgent() {
  const [input, setInput] = useState<string>();

  useEffect(() => {
    (async () => {
      try {
        const data = await getSelectedText();
        setInput(data);
      } catch {
        showToast(Toast.Style.Failure, "Unable to get selected text");
        popToRoot();
      }
    })();
  }, []);

  const parser = new UAParser(input);
  const parserResults = parser.getResult();

  const markdown = renderMarkdown(parserResults);

  return (
    <Detail
      isLoading={input === undefined}
      markdown={input === undefined ? "" : markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(parserResults, null, 2)} />
        </ActionPanel>
      }
    />
  );
}

// Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8 rv:3.0; ET) AppleWebKit/537.0.0 (KHTML, like Gecko) Version/5.1.6 Safari/537.0.0
