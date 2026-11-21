import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { duration, limits, stats } from "./lib/text";
import { fmt, readInput, SOURCE_LABEL } from "./lib/input";
import { toolUrl } from "./lib/site";

export default function Command(props: LaunchProps<{ arguments: Arguments.CountWords }>) {
  const { data, isLoading } = usePromise(readInput, [props.arguments.text]);
  const text = data?.text ?? "";
  const s = stats(text);

  const summary = [
    `Words: ${fmt(s.words)}`,
    `Characters: ${fmt(s.chars)}`,
    `Characters without spaces: ${fmt(s.charsNoSpaces)}`,
    `Sentences: ${fmt(s.sentences)}`,
    `Paragraphs: ${fmt(s.paragraphs)}`,
    `Lines: ${fmt(s.lines)}`,
    `Reading time: ${duration(s.readSeconds)}`,
    `Speaking time: ${duration(s.speakSeconds)}`,
  ].join("\n");

  const markdown =
    data?.source === "none"
      ? "## Nothing to count\n\nSelect some text or copy it to the clipboard, then run the command again. You can also type the text as the command argument."
      : `# ${fmt(s.words)} words · ${fmt(s.chars)} characters\n\n` +
        "| Platform | Limit | Left |\n| --- | ---: | ---: |\n" +
        limits(text)
          .map((l) => `| ${l.label} | ${fmt(l.limit)} | ${l.left >= 0 ? fmt(l.left) : `**${fmt(-l.left)} over**`} |`)
          .join("\n") +
        "\n\nX counts emoji and CJK characters as 2 and every link as 23. Reading time uses 238 words a minute. " +
        `More text tools on [GoSaveTool](${toolUrl("character-counter")}).`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={isLoading ? "" : markdown}
      metadata={
        data && data.source !== "none" ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Words" text={fmt(s.words)} />
            <Detail.Metadata.Label title="Characters" text={fmt(s.chars)} />
            <Detail.Metadata.Label title="Without Spaces" text={fmt(s.charsNoSpaces)} />
            <Detail.Metadata.Label title="Sentences" text={fmt(s.sentences)} />
            <Detail.Metadata.Label title="Paragraphs" text={fmt(s.paragraphs)} />
            <Detail.Metadata.Label title="Lines" text={fmt(s.lines)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Reading Time" text={duration(s.readSeconds)} />
            <Detail.Metadata.Label title="Speaking Time" text={duration(s.speakSeconds)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Source" text={SOURCE_LABEL[data.source]} />
            <Detail.Metadata.Link title="Online Tool" target={toolUrl("character-counter")} text="Character Counter" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Counts" content={summary} />
          <Action.OpenInBrowser title="Open Character Counter" url={toolUrl("character-counter")} />
        </ActionPanel>
      }
    />
  );
}
