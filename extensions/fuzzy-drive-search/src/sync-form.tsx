import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { useSync } from "./hooks/useSync";
import { useConfig } from "./hooks/useConfig";

interface FolderUrl {
  id: string;
  url: string;
}

export default function SyncForm() {
  const [folderUrls, setFolderUrls] = useState<FolderUrl[]>([]);
  const [initialized, setInitialized] = useState(false);
  const { syncFiles } = useSync();
  const { folderInfos, isLoading } = useConfig();

  // 既存の設定を初期値として設定（一度だけ実行）
  useEffect(() => {
    if (!isLoading && !initialized && folderInfos) {
      if (folderInfos.length > 0) {
        const initialUrls = folderInfos.map((info, index) => ({
          id: (index + 1).toString(),
          url: info.url,
        }));
        // 最低1つは空の入力欄を確保
        if (initialUrls.length < 10) {
          initialUrls.push({ id: (initialUrls.length + 1).toString(), url: "" });
        }
        setFolderUrls(initialUrls);
      } else {
        // 既存設定がない場合は空の入力欄1つ
        setFolderUrls([{ id: "1", url: "" }]);
      }
      setInitialized(true);
    }
  }, [isLoading, initialized, folderInfos]);

  const addFolderUrl = () => {
    if (folderUrls.length < 10) {
      const newId = (folderUrls.length + 1).toString();
      setFolderUrls([...folderUrls, { id: newId, url: "" }]);
    }
  };

  const updateFolderUrl = (id: string, url: string) => {
    setFolderUrls(folderUrls.map((folder) => (folder.id === id ? { ...folder, url } : folder)));
  };

  const extractFolderIdFromUrl = (url: string): string | null => {
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSubmit = async () => {
    const validUrls = folderUrls.filter((folder) => folder.url.trim());

    if (validUrls.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "少なくとも1つのフォルダURLを入力してください",
      });
      return;
    }

    const folderIds: string[] = [];
    for (const folder of validUrls) {
      const folderId = extractFolderIdFromUrl(folder.url);
      if (!folderId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "エラー",
          message: `無効なGoogle DriveフォルダURL: ${folder.url}`,
        });
        return;
      }
      folderIds.push(folderId);
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "同期中...",
        message: `${folderIds.length}個のフォルダから同期しています`,
      });

      await syncFiles(() => {});

      await showToast({
        style: Toast.Style.Success,
        title: "同期完了",
        message: `${folderIds.length}個のフォルダの同期が完了しました`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "同期エラー",
        message: error instanceof Error ? error.message : "同期に失敗しました",
      });
    }
  };

  if (isLoading) {
    return (
      <Form>
        <Form.Description text="既存の設定を読み込み中..." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="同期を実行" onSubmit={handleSubmit} />
          {folderUrls.length < 10 && <Action title="フォルダを追加" onAction={addFolderUrl} />}
        </ActionPanel>
      }
    >
      <Form.Description text="Google Driveのフォルダを同期します。フォルダのURLを入力してください。最大10個まで設定できます。" />

      {folderUrls.map((folder, index) => {
        const folderInfo = folderInfos[index];
        const title = folderInfo?.name || `フォルダ ${index + 1}`;

        return (
          <Form.TextField
            key={folder.id}
            id={`folder-${folder.id}`}
            title={title}
            placeholder="https://drive.google.com/drive/folders/1ABC..."
            value={folder.url}
            onChange={(url) => updateFolderUrl(folder.id, url)}
            info="Google DriveフォルダのURLを貼り付けてください"
          />
        );
      })}

      {folderUrls.length > 1 && (
        <Form.Description text="不要なフォルダを削除するには、URLを空にして同期を実行してください。" />
      )}

      <Form.Separator />

      <Form.Description
        text="使用方法:
1. Google DriveでフォルダのURLをコピー
2. 上記の入力欄に貼り付け
3. 複数のフォルダを追加する場合は「フォルダを追加」ボタンを使用
4. 「同期を実行」でファイル一覧を更新"
      />
    </Form>
  );
}
