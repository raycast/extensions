import { Action, ActionPanel, Detail, getSelectedText } from "@raycast/api";
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
    section("User Agent", "`" + ua + "`"),
    isEmpty && "Empty user agent",
  );
}

export default function CheckUserAgent() {
  const [input, setInput] = useState<string>();

  useEffect(() => {
    (async () => {
      const data =
        process.env.NODE_ENV === "development"
          ? "Mozilla/5.0 (Linux; Android 11; Pixel 4a Build/RP1A.200720.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/84.0.4147.111 Mobile Safari/537.36"
          : await getSelectedText();
      setInput(data);
    })();
  }, []);

  const parser = new UAParser(input);
  const parserResults = parser.getResult();

  const markdown = renderMarkdown(parserResults);

  return (
    <Detail
      isLoading={input === undefined}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(parserResults, null, 2)} />
        </ActionPanel>
      }
    />
  );
}
