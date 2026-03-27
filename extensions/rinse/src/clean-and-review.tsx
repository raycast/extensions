import { useEffect, useState } from "react";
import { type CleanResult } from "./utils/cleaner";
import { HUD_EMPTY, HUD_UNCHANGED, buildHudText, readAndClean } from "./utils/clipboard";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  closeMainWindow,
  showHUD,
  useNavigation,
} from "@raycast/api";

function useClipboardClean(): { result: CleanResult | null; loading: boolean } {
  const [result, setResult] = useState<CleanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readAndClean().then((outcome) => {
      if (outcome.status === "empty") {
        setLoading(false);
        showHUD(HUD_EMPTY).then(() => closeMainWindow());
        return;
      }
      if (outcome.status === "unchanged") {
        setLoading(false);
        showHUD(HUD_UNCHANGED).then(() => closeMainWindow());
        return;
      }
      setResult(outcome.result);
      setLoading(false);
    });
  }, []);

  return { result, loading };
}

function buildMarkdown(result: CleanResult): string {
  return `\`\`\`\n${result.cleaned}\n\`\`\``;
}

function CleanMetadata({ result }: { result: CleanResult }) {
  const { originalLineCount, cleanedLineCount } = result;
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Reduction">
        <Detail.Metadata.TagList.Item text={`${result.reductionPercent}% rinsed`} color={Color.Green} />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label text={`${result.original.length} → ${result.cleaned.length}`} title="Characters" />
      <Detail.Metadata.Label text={`${originalLineCount} → ${cleanedLineCount}`} title="Lines" />
    </Detail.Metadata>
  );
}

function CleanActions({ onCopy }: { onCopy: () => void }) {
  return (
    <ActionPanel>
      <Action
        icon={Icon.Clipboard}
        onAction={onCopy}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        title="Copy to Clipboard"
      />
    </ActionPanel>
  );
}

export default function CleanAndReview() {
  const { result, loading } = useClipboardClean();
  const { pop } = useNavigation();

  async function copyAndClose() {
    if (!result) {
      return;
    }
    await Clipboard.copy(result.cleaned);
    pop();
    await showHUD(buildHudText(result.reductionPercent));
  }

  if (loading || !result) {
    return <Detail isLoading />;
  }

  return (
    <Detail
      markdown={buildMarkdown(result)}
      metadata={<CleanMetadata result={result} />}
      actions={<CleanActions onCopy={copyAndClose} />}
    />
  );
}
