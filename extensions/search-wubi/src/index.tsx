import { List, Detail, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";

interface CharInfo {
  unicode: string;
  groups: string[];
  ids: string;
  strokes: string;
  pinyin: string;
  radical: string;
  basic: number;
  code: string;
  shortCode: string;
  faultCode: string;
  units: string;
  flag: string;
  segments: number[][];
  unitType: string;
}

interface CharWriterData {
  strokes: string[];
  medians: number[][][];
}

interface ResultItem {
  char: string;
  info?: CharInfo;
  writerData?: CharWriterData;
}

function char2hex(char: string) {
  const length = 2;
  const hex = char.codePointAt(0)?.toString(16) || "";
  return hex.substring(hex.length - length).toLowerCase();
}

function generateCombinedSvgDataUri(
  strokes: string[],
  allSegments: number[][],
) {
  const stepWidth = 1024;
  const height = 1024;
  const gap = 60; // 增加间距
  const padding = 40; // 内部留白
  const borderRadius = 80; // 圆角
  const totalWidth = (stepWidth + gap) * allSegments.length - gap;

  const svgSteps = allSegments
    .map((highlightIndices, stepIndex) => {
      const paths = strokes
        .map((d, i) => {
          const isHighlighted = highlightIndices.includes(i);
          const color = isHighlighted ? "#FF4D4F" : "#555555"; // 加深非高亮笔画的灰色
          const opacity = isHighlighted ? "1" : "0.15";
          return `<path d="${d}" fill="${color}" fill-opacity="${opacity}" />`;
        })
        .join("");

      return `<g transform="translate(${(stepWidth + gap) * stepIndex}, 0)">
                <rect width="${stepWidth}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="#FFFFFF" />
                <g transform="translate(${padding}, ${padding}) scale(${(stepWidth - padding * 2) / 1024}, ${(height - padding * 2) / 1024})">
                  <g transform="scale(1, -1) translate(0, -900)">
                    ${paths}
                  </g>
                </g>
              </g>`;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}">
      ${svgSteps}
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function getCharMarkdown(
  char: string,
  info: CharInfo,
  writerData?: CharWriterData,
) {
  const combinedImageUri =
    writerData && info.segments && info.segments.length > 0
      ? generateCombinedSvgDataUri(writerData.strokes, info.segments)
      : "";

  const decompositionImageMarkdown = combinedImageUri
    ? `![Decomposition](${combinedImageUri})`
    : "";

  return `
# ${char}

${decompositionImageMarkdown}

| 属性 | 内容 |
| --- | --- |
| **五笔全码** | \`${info.code}\` |
| **五笔拆解** | ${info.units} |
| **简码/容错** | ${info.shortCode || "无"} / ${info.faultCode || "无"} |
| **拼音** | ${info.pinyin} |
| **笔画** | ${info.strokes} |
| **部首** | ${info.radical} |
| **字表** | ${info.groups.join(", ")} |
| **拆解类型** | ${info.unitType} |

### 五笔字根拆解图解
${combinedImageUri ? "上图展示了该汉字的五笔字根拆解顺序（红色高亮部分）。" : "暂无图解数据。"}
`;
}

export default function Command(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchText.length === 0) {
      setResults([]);
      return;
    }

    const chars = Array.from(
      searchText.replace(/[a-zA-Z\d\s]/g, "").slice(0, 10),
    ) as string[];
    if (chars.length === 0) {
      setResults([]);
      return;
    }

    async function fetchAll() {
      setIsLoading(true);
      const newResults: ResultItem[] = await Promise.all(
        chars.map(async (char: string) => {
          try {
            const hex = char2hex(char);
            const infoUrl = `https://hantang.github.io/search-wubi/data/chars/${hex}/${encodeURIComponent(char)}.json`;
            const writerUrl = `https://hantang.github.io/search-wubi/data/hanzi-writer-data/${encodeURIComponent(char)}.json`;

            const [infoRes, writerRes] = await Promise.all([
              fetch(infoUrl),
              fetch(writerUrl),
            ]);

            let info: CharInfo | undefined;
            let writerData: CharWriterData | undefined;

            if (infoRes.ok) {
              info = (await infoRes.json()) as CharInfo;
            }
            if (writerRes.ok) {
              writerData = (await writerRes.json()) as CharWriterData;
            }

            return { char, info, writerData };
          } catch (e) {
            console.error(e);
          }
          return { char };
        }),
      );
      setResults(newResults);
      setIsLoading(false);
    }

    const timeoutId = setTimeout(() => {
      fetchAll();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="输入汉字查询五笔拆解..."
      throttle
      isShowingDetail={results.length > 0}
    >
      {results.map((item: ResultItem, index: number) => (
        <List.Item
          key={`${item.char}-${index}`}
          title={item.char}
          subtitle={results.length > 1 ? item.info?.code : ""}
          accessories={
            !item.info || results.length > 1
              ? []
              : [{ text: item.info?.pinyin || "" }]
          }
          detail={
            item.info ? (
              <List.Item.Detail
                markdown={getCharMarkdown(
                  item.char,
                  item.info,
                  item.writerData,
                )}
              />
            ) : null
          }
          actions={
            <ActionPanel>
              {item.info ? (
                <>
                  <Action.Push
                    title="查看全屏详情"
                    target={
                      <CharDetail
                        char={item.char}
                        info={item.info}
                        writerData={item.writerData}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="复制全码"
                    content={item.info.code}
                  />
                </>
              ) : null}
              <Action.OpenInBrowser
                url={`https://hantang.github.io/search-wubi/?char=${encodeURIComponent(item.char)}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CharDetail({
  char,
  info,
  writerData,
}: {
  char: string;
  info: CharInfo;
  writerData?: CharWriterData;
}): JSX.Element {
  return (
    <Detail
      markdown={getCharMarkdown(char, info, writerData)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://hantang.github.io/search-wubi/?char=${encodeURIComponent(char)}`}
          />
          <Action.CopyToClipboard title="复制全码" content={info.code} />
        </ActionPanel>
      }
    />
  );
}
