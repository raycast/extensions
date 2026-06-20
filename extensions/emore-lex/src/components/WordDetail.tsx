import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { WordResult } from "../types/word";
import { playPronunciation } from "../services/pronunciation";
import { isFavorite, toggleFavorite } from "../storage/favorites";
import { renderWordCsv, renderWordMarkdown } from "../utils/markdown";

type WordDetailProps = {
  result: WordResult;
};

export function WordDetail({ result }: WordDetailProps) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    void isFavorite(result.word).then(setFavorite);
  }, [result.word]);

  return (
    <Detail
      markdown={renderDetailMarkdown(result)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="发音">
            {result.phonetics
              .filter((phonetic) => phonetic.audioUrl)
              .map((phonetic) => (
                <Action
                  key={`${phonetic.region}-${phonetic.audioUrl}`}
                  title={`播放${phonetic.region === "US" ? "美式" : phonetic.region === "UK" ? "英式" : ""}发音`}
                  icon={Icon.SpeakerHigh}
                  onAction={() => void handlePlay(phonetic.audioUrl)}
                />
              ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="学习">
            <Action
              title={favorite ? "取消收藏" : "收藏单词"}
              icon={favorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => void handleToggleFavorite(result.word, setFavorite)}
            />
            <Action.CopyToClipboard
              title="复制 Markdown"
              content={renderWordMarkdown(result)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="复制 CSV"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={() => void handleCopyCsv(result)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function handlePlay(audioUrl?: string): Promise<void> {
  if (!audioUrl) return;

  try {
    await playPronunciation(audioUrl);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "发音播放失败",
      message: error instanceof Error ? error.message : "未知错误",
    });
  }
}

async function handleToggleFavorite(word: string, setFavorite: (value: boolean) => void): Promise<void> {
  const nextFavorite = await toggleFavorite(word);
  setFavorite(nextFavorite);
  await showToast({
    style: Toast.Style.Success,
    title: nextFavorite ? "已收藏" : "已取消收藏",
    message: word,
  });
}

async function handleCopyCsv(result: WordResult): Promise<void> {
  await Clipboard.copy(renderWordCsv(result));
  await showToast({ style: Toast.Style.Success, title: "已复制 CSV" });
}

function renderDetailMarkdown(result: WordResult): string {
  const lines = [
    `# ${result.word}`,
    "",
    renderPhonetics(result),
    result.syllables ? `**音节**：${result.syllables}` : undefined,
    result.pronunciationHint ? `**发音提示**：${result.pronunciationHint}` : undefined,
    "",
    "## 中文释义",
    ...result.chineseDefinitions.map((definition, index) => `${index + 1}. ${definition}`),
    "",
    "## 英文释义",
    ...(result.definitions.length > 0
      ? result.definitions.map((definition) => `- **${definition.partOfSpeech}.** ${definition.english}`)
      : ["- 暂无远程英文释义。"]),
    "",
    "## 例句",
    ...(result.examples.length > 0
      ? result.examples.map((definition) => `- ${definition.example ?? definition.english}`)
      : ["- 暂无例句。"]),
    "",
    "## 词形变化",
    `- Base Form: ${result.inflections.base}`,
    result.inflections.past ? `- Past: ${result.inflections.past}` : undefined,
    result.inflections.pastParticiple ? `- Past Participle: ${result.inflections.pastParticiple}` : undefined,
    result.inflections.presentParticiple ? `- Present Participle: ${result.inflections.presentParticiple}` : undefined,
    result.inflections.plural ? `- Plural: ${result.inflections.plural}` : undefined,
    "",
    "## 常见搭配",
    ...(result.collocations.length > 0 ? result.collocations.map((item) => `- ${item}`) : ["- 暂无本地搭配。"]),
    "",
    "## 同义词",
    ...(result.synonyms.length > 0 ? result.synonyms.map((item) => `- ${item}`) : ["- 暂无同义词。"]),
    "",
    ...renderTechSection(result),
    "---",
    `数据来源：${renderSource(result.source)} · 更新时间：${new Date(result.updatedAt).toLocaleString("zh-CN")}`,
  ].filter((line): line is string => line !== undefined);

  return lines.join("\n");
}

function renderPhonetics(result: WordResult): string | undefined {
  if (result.phonetics.length === 0) return undefined;
  return result.phonetics.map((phonetic) => `**${phonetic.region}** ${phonetic.text ?? ""}`.trim()).join("  \n");
}

function renderTechSection(result: WordResult): string[] {
  const entry = result.techEntry;
  if (!entry) return [];

  return [
    "## 运维英语模式",
    `**场景**：${entry.chinese}`,
    "",
    entry.explanation,
    "",
    `**覆盖领域**：${entry.domains.join("、")}`,
    "",
    "### 常见原因",
    ...(entry.commonCauses ?? []).map((item) => `- ${item}`),
    "",
    "### 常见解决方案",
    ...(entry.solutions ?? []).map((item) => `- ${item}`),
    "",
    "### 常见命令",
    ...(entry.commands ?? []).map((item) => `- ${item}`),
    "",
    "### 技术例句",
    ...(entry.examples ?? []).map((item) => `- ${item}`),
    "",
  ];
}

function renderSource(source: WordResult["source"]): string {
  if (source === "cache") return "本地缓存";
  if (source === "local") return "本地词库";
  return "远程词典";
}
