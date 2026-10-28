import { searchCustom } from "./custom-source";
import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  Toast,
  environment,
  showToast,
  getPreferenceValues,
  type LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, extname } from "node:path";
import {
  downloadImage,
  searchPage,
  searchUrl,
  type Meme,
  type SearchPage,
} from "./source";

async function copyImage(item: Meme) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "正在复制图片…",
  });
  try {
    const bytes = await downloadImage(item.url);
    await mkdir(join(environment.supportPath, "images"), { recursive: true });
    const file = join(
      join(environment.supportPath, "images"),
      createHash("sha256").update(item.url).digest("hex") +
        extname(new URL(item.url).pathname),
    );
    await writeFile(file, bytes);
    await Clipboard.copy({ file });
    toast.style = Toast.Style.Success;
    toast.title = "图片已复制，可切换到聊天窗口粘贴";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "复制失败";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export default function Command(
  props: LaunchProps<{ arguments: { keyword: string } }>,
) {
  const keyword = (props.fallbackText || props.arguments.keyword || "").trim();
  return <Results keyword={keyword} />;
}

function Results({ keyword }: { keyword: string }) {
  const { customSource } = getPreferenceValues<{ customSource?: string }>();
  const sourceName = customSource?.trim() ? "自定义源" : "腾讯／搜狗";
  const [pages, setPages] = useState<string[]>([]);
  const [result, setResult] = useState<SearchPage>({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const url = pages.at(-1) || (keyword.trim() ? searchUrl(keyword) : "");
  useEffect(() => {
    const controller = new AbortController();
    setResult({ items: [] });
    setError("");
    setLoading(Boolean(url));
    if (url) {
      (customSource?.trim()
        ? searchCustom(
            customSource,
            keyword,
            pages.length || 1,
            controller.signal,
          )
        : searchPage(url, controller.signal)
      )
        .then((data) => {
          if (!controller.signal.aborted) setResult(data);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted)
            setError(reason instanceof Error ? reason.message : String(reason));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }
    return () => controller.abort();
  }, [url, customSource, keyword, pages.length]);

  const navigation = (
    <ActionPanel.Section title={`${sourceName} · 第 ${pages.length || 1} 页`}>
      {result.next && (
        <Action
          title="下一页"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
          onAction={() =>
            setPages([...(pages.length ? pages : [url]), result.next!])
          }
        />
      )}
      {pages.length > 1 && (
        <Action
          title="上一页"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={() => setPages(pages.slice(0, -1))}
        />
      )}
    </ActionPanel.Section>
  );

  return (
    <Grid
      columns={5}
      fit={Grid.Fit.Contain}
      isLoading={loading}
      filtering={false}
      searchText=""
      onSearchTextChange={() => {}}
      navigationTitle={`${keyword} · ${sourceName} · 第 ${pages.length || 1} 页`}
      searchBarPlaceholder="方向键选图，回车复制；Esc 返回 Raycast 搜索"
    >
      <Grid.EmptyView
        title={
          error
            ? "搜索失败"
            : keyword.trim()
              ? "没有找到表情包"
              : "搜索中文表情包"
        }
        description={
          error ||
          (keyword.trim()
            ? "按 Esc 返回 Raycast，换一个关键词搜索"
            : "输入关键词开始搜索 · 图片来自 腾讯／搜狗")
        }
        actions={<ActionPanel>{navigation}</ActionPanel>}
      />
      {result.items.map((item) => (
        <Grid.Item
          key={item.url}
          content={item.url}
          title={item.title}
          actions={
            <ActionPanel>
              <Action
                title="复制图片"
                icon={Icon.Clipboard}
                onAction={() => copyImage(item)}
              />
              <Action.CopyToClipboard title="复制图片链接" content={item.url} />
              <Action.OpenInBrowser title="查看原图" url={item.pageUrl} />
              {navigation}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
