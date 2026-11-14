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
  openExtensionPreferences,
  type LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { downloadImage, type Meme, type SearchPage } from "./source";

async function copyImage(item: Meme) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "正在复制图片…",
  });
  try {
    const { bytes, extension } = await downloadImage(item.url);
    await mkdir(join(environment.supportPath, "images"), { recursive: true });
    const file = join(
      join(environment.supportPath, "images"),
      createHash("sha256").update(item.url).digest("hex") + extension,
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
  props: LaunchProps<{ arguments: Arguments.Search }>,
) {
  const keyword = (props.fallbackText || props.arguments.keyword || "").trim();
  return <Results keyword={keyword} />;
}

function Results({ keyword }: { keyword: string }) {
  const { customSource } = getPreferenceValues<Preferences>();
  const configured = Boolean(customSource?.trim());
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchPage>({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setResult({ items: [] });
    setError("");
    setLoading(configured && Boolean(keyword));
    if (configured && keyword) {
      searchCustom(customSource!, keyword, page, controller.signal)
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
  }, [customSource, configured, keyword, page]);

  const navigation = (
    <ActionPanel.Section title={`自定义源 · 第 ${page} 页`}>
      {result.next && (
        <Action
          title="下一页"
          icon={Icon.ArrowRight}
          shortcut={{ modifiers: ["cmd"], key: "]" }}
          onAction={() => setPage(page + 1)}
        />
      )}
      {page > 1 && (
        <Action
          title="上一页"
          icon={Icon.ArrowLeft}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
          onAction={() => setPage(page - 1)}
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
      searchBarPlaceholder="方向键选图，回车复制；Esc 返回 Raycast 搜索"
    >
      <Grid.EmptyView
        title={
          !configured
            ? "请先配置表情包源"
            : error
              ? "搜索失败"
              : keyword.trim()
                ? "没有找到表情包"
                : "搜索中文表情包"
        }
        description={
          !configured
            ? "需要自行配置数据源。按 ⌘K 查看接入指引或申请官方 API"
            : error ||
              (keyword.trim()
                ? "按 Esc 返回 Raycast，换一个关键词搜索"
                : "输入关键词开始搜索")
        }
        actions={
          <ActionPanel>
            <Action
              title="配置表情包源"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
            <Action.OpenInBrowser
              title="查看数据源接入指引"
              url="https://github.com/raycast/extensions/blob/main/extensions/chinese-meme-search/README.md#获取数据源与申请"
            />
            <Action.OpenInBrowser
              title="申请 SOOGIF 官方 API"
              url="https://open.soogif.com/"
            />
            {navigation}
          </ActionPanel>
        }
      />
      <Grid.Section title={keyword} subtitle={`自定义源 · 第 ${page} 页`}>
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
                <Action.CopyToClipboard
                  title="复制图片链接"
                  content={item.url}
                />
                <Action.OpenInBrowser title="查看原图" url={item.pageUrl} />
                {navigation}
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
