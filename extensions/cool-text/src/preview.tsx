import { Action, ActionPanel, Clipboard, Icon, List, Toast, showHUD, showToast, type LaunchProps } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ASCII_FONTS, DEFAULT_FONT, transformText } from "./transform";
import { renderCoolText } from "./render";
import copyQuickText from "./cool-text";
import ImageCommand from "./image";
import type { DotTextDetail } from "./dot-text";

const EXAMPLE_TEXT = "Cool";
const STYLES = [
  {
    id: "alphabet",
    title: "Alphabet Emoji",
    icon: Icon.Text,
    hint: "Uses your workspace's custom yellow and white alphabet emoji.",
  },
  {
    id: "ascii",
    title: "ASCII Art",
    icon: Icon.CodeBlock,
    hint: "Paste into a code block to keep alignment. Emoji images load from Twemoji when needed.",
  },
  {
    id: "dots",
    title: "Unicode Dots",
    icon: Icon.Circle,
    hint: "Fine dot art using Unicode Braille. Paste into a code block for consistent spacing.",
  },
] as const;

type ArtPreview = {
  source: string;
  font: string;
  detail: DotTextDetail;
  variant: string;
  output: string;
  error: string;
};

export default function Preview({ arguments: args }: LaunchProps<{ arguments: Arguments.Preview }>) {
  const [text, setText] = useState(args.text || "");
  const [selectedStyle, setSelectedStyle] = useState<string>(args.variant || "alphabet");
  const [font, setFont] = useState<string>(args.font || DEFAULT_FONT);
  const [dotDetail, setDotDetail] = useState<DotTextDetail>("Detailed");
  const quickCopyStarted = useRef(false);
  const [art, setArt] = useState<ArtPreview>();
  const hasInput = Boolean(text.trim());
  const source = hasInput ? text : EXAMPLE_TEXT;
  const artReady =
    art?.source === source && art.font === font && art.detail === dotDetail && art.variant === selectedStyle;

  useEffect(() => {
    if (!args.text || quickCopyStarted.current) return;
    quickCopyStarted.current = true;
    void copyQuickText(args);
  }, [args]);

  useEffect(() => {
    if (selectedStyle === "alphabet" || artReady) return;
    let cancelled = false;
    renderCoolText(source, selectedStyle, font, dotDetail).then(
      (output) => {
        if (!cancelled) setArt({ source, font, detail: dotDetail, variant: selectedStyle, output, error: "" });
      },
      (error: unknown) => {
        if (!cancelled)
          setArt({
            source,
            font,
            detail: dotDetail,
            variant: selectedStyle,
            output: "",
            error: error instanceof Error ? error.message : "Could not preview text",
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source, font, dotDetail, selectedStyle, artReady]);

  const alphabetOutput = transformText(source);
  function cycleStyle(direction: number) {
    setSelectedStyle((current) => {
      const index = STYLES.findIndex((style) => style.id === current);
      return STYLES[(index + direction + STYLES.length) % STYLES.length].id;
    });
  }

  async function copy(style: string) {
    const issue = !hasInput
      ? "Type some text first."
      : style !== "alphabet" && (!artReady || art?.variant !== style)
        ? "Your preview is still loading."
        : style !== "alphabet"
          ? art?.error
          : "";
    if (issue) {
      await showToast({ style: Toast.Style.Failure, title: "Not ready to copy", message: issue });
      return;
    }
    try {
      await Clipboard.copy(style === "alphabet" ? alphabetOutput : art!.output);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not copy",
        message: "Your text is still here. Try again.",
      });
      return;
    }
    await showHUD("CoolText copied");
  }

  return (
    <List
      searchBarPlaceholder="Type text or emoji… Tab switches style"
      searchText={text}
      onSearchTextChange={setText}
      selectedItemId={selectedStyle}
      onSelectionChange={(id) => {
        if (id) setSelectedStyle(id);
      }}
      filtering={false}
      isShowingDetail
      isLoading={selectedStyle !== "alphabet" && !artReady}
      searchBarAccessory={
        selectedStyle === "ascii" ? (
          <List.Dropdown tooltip="ASCII font" value={font} onChange={setFont}>
            {ASCII_FONTS.map((name) => (
              <List.Dropdown.Item key={name} title={name} value={name} />
            ))}
          </List.Dropdown>
        ) : selectedStyle === "dots" ? (
          <List.Dropdown
            tooltip="Dot text detail"
            value={dotDetail}
            onChange={(value) => setDotDetail(value as DotTextDetail)}
          >
            <List.Dropdown.Item title="Detailed" value="Detailed" />
            <List.Dropdown.Item title="Compact" value="Compact" />
          </List.Dropdown>
        ) : undefined
      }
    >
      {STYLES.map((style) => {
        const pending = style.id !== "alphabet" && (!artReady || art?.variant !== style.id);
        const error = style.id !== "alphabet" && !pending ? art!.error : "";
        const output = style.id === "alphabet" ? alphabetOutput : art?.output || "";
        const body = pending
          ? "Preparing your preview…"
          : error
            ? `${error}\n\nEdit your text or choose Alphabet Emoji.`
            : `${hasInput ? "" : '**Example: "Cool"**\n\n'}${output
                .split("\n")
                .map((line) => `    ${line}`)
                .join("\n")}`;
        return (
          <List.Item
            key={style.id}
            id={style.id}
            title={style.title}
            icon={style.icon}
            accessories={error ? [{ icon: Icon.ExclamationMark, tooltip: error }] : []}
            detail={<List.Item.Detail markdown={`## ${style.title}\n\n${body}\n\n${style.hint}`} />}
            actions={
              <ActionPanel>
                <Action title="Copy Text" icon={Icon.Clipboard} onAction={() => copy(style.id)} />
                <Action.Push
                  title="Image to Text Art"
                  icon={Icon.Image}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
                  target={<ImageCommand />}
                />
                <Action
                  title="Next Style"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: [], key: "tab" }}
                  onAction={() => cycleStyle(1)}
                />
                <Action
                  title="Previous Style"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["shift"], key: "tab" }}
                  onAction={() => cycleStyle(-1)}
                />
                {error ? (
                  <Action title="Retry Preview" icon={Icon.ArrowClockwise} onAction={() => setArt(undefined)} />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
