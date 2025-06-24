import { ActionPanel, Action, Icon, List } from "@raycast/api";
import AuthForm from "./auth-form";
import SyncForm from "./sync-form";
import { useSearch } from "./hooks/useSearch";
import { useInitialization } from "./hooks/useInitialization";
import { useSync } from "./hooks/useSync";

const getIconForMimeType = (filename: string, mimeType?: string) => {
  // MIME typeがある場合は優先的に使用
  if (mimeType) {
    if (mimeType.includes("spreadsheet")) return Icon.BarChart;
    if (mimeType.includes("presentation")) return Icon.Monitor;
    if (mimeType.includes("document")) return Icon.Text;
    if (mimeType.includes("folder")) return Icon.Folder;
    if (mimeType.includes("image")) return Icon.Image;
    if (mimeType === "application/pdf") return Icon.Document;
  }

  // 拡張子による判定（フォールバック）
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, Icon> = {
    pdf: Icon.Document,
    doc: Icon.Text,
    docx: Icon.Text,
    xls: Icon.BarChart,
    xlsx: Icon.BarChart,
    ppt: Icon.Monitor,
    pptx: Icon.Monitor,
    png: Icon.Image,
    jpg: Icon.Image,
    jpeg: Icon.Image,
    gif: Icon.Image,
    txt: Icon.Text,
  };
  return iconMap[ext] || Icon.Document;
};

export default function Command() {
  const { searchText, setSearchText, results, isLoading, refreshSearch } = useSearch();
  const { initialize } = useInitialization();
  const { syncFiles } = useSync();

  const handleSync = () => {
    syncFiles(refreshSearch);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Google Drive内のファイルを検索..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={false}
      filtering={false}
    >
      {results.length === 0 && searchText.trim() === "" ? (
        <List.Section title="操作">
          <List.Item
            title="認証設定"
            subtitle="Google Drive APIの認証情報を設定"
            icon={Icon.Key}
            actions={
              <ActionPanel>
                <Action.Push title="認証設定フォームを開く" icon={Icon.Key} target={<AuthForm />} />
                <Action
                  title="既存の設定で初期化"
                  icon={Icon.ArrowClockwise}
                  onAction={initialize}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="手動同期"
            subtitle="Google Driveフォルダを指定して同期"
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action.Push title="同期フォームを開く" icon={Icon.FolderOpen} target={<SyncForm />} />
                <Action title="簡易同期" icon={Icon.RotateClockwise} onAction={handleSync} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : results.length > 0 ? (
        <List.Section title={`検索結果 (${results.length}件)`}>
          {results.map((item) => (
            <List.Item
              key={item.uid}
              title={item.title}
              subtitle={`📁 ${item.subtitle}`}
              icon={getIconForMimeType(item.title, item.mimeType)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="ブラウザで開く" icon={Icon.Globe} url={item.arg} />
                  <Action.CopyToClipboard title="URLをコピー" icon={Icon.Clipboard} content={item.arg} />
                  <Action
                    title="手動同期"
                    icon={Icon.RotateClockwise}
                    onAction={handleSync}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="検索結果が見つかりません"
          description={`"${searchText}" に一致するファイルがありません`}
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
