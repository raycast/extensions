/* eslint-disable */
import React, { useState, useEffect } from "react";
import {
  ActionPanel,
  List,
  Action,
  showToast,
  Toast,
  Icon,
  Detail,
  useNavigation,
  confirmAlert,
  Form,
} from "@raycast/api";
import {
  SalesforceService,
  MemoFileService,
  SalesforceRecord,
} from "./utils/salesforce";
import path from "path";
import fs from "fs";

interface MemoItem {
  title: string;
  path: string;
  metadata: {
    sfId?: string;
    sfName?: string;
    sfType?: string;
    createdAt?: string;
  };
}

// メモのJSONデータの型定義
interface MemoData {
  title: string;
  content: string;
  metadata: {
    createdAt?: string;
    updatedAt?: string;
    sfId?: string;
    sfName?: string;
    sfType?: string;
  };
  syncStatus?: {
    lastSyncedAt: string | null;
    sfNoteId: string | null;
  };
}

export default function ViewMemos() {
  const [isLoading, setIsLoading] = useState(true);
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const { push } = useNavigation();
  const memoFileService = new MemoFileService();

  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    setIsLoading(true);
    try {
      const memoPaths = memoFileService.listMemos();
      const memoItems: MemoItem[] = [];

      for (const memoPath of memoPaths) {
        try {
          const { content, metadata } = memoFileService.readMemo(memoPath);
          const filename = path.basename(memoPath);

          // マークダウンからタイトルを抽出 (最初の# で始まる行)
          // タイトル抽出を改善：複数行にまたがる場合も考慮
          let title = filename;
          const titleMatch = content.match(/^#\s+(.+)$/m);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            // タイトルに不正な文字がないか確認
            if (title.length === 0) {
              title = filename;
            }
            // コンソールにタイトルのバイト表現も出力（デバッグ用）
            console.log(
              `タイトル「${title}」のバイト長: ${Buffer.from(title).length}`,
            );
          }

          memoItems.push({
            title,
            path: memoPath,
            metadata: metadata as MemoItem["metadata"],
          });
        } catch (error) {
          console.error(`Failed to read memo ${memoPath}:`, error);
        }
      }

      // 作成日時の新しい順に並べ替え
      memoItems.sort((a, b) => {
        const dateA = a.metadata.createdAt
          ? new Date(a.metadata.createdAt).getTime()
          : 0;
        const dateB = b.metadata.createdAt
          ? new Date(b.metadata.createdAt).getTime()
          : 0;
        return dateB - dateA;
      });

      setMemos(memoItems);
    } catch (error) {
      console.error("メモ読み込みエラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "メモの読み込み中にエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMemo = async (memo: MemoItem) => {
    const confirmed = await confirmAlert({
      title: "メモを削除",
      message: `"${memo.title}" を削除しますか？`,
      primaryAction: {
        title: "削除",
      },
    });

    if (confirmed) {
      try {
        fs.unlinkSync(memo.path);
        await showToast({
          style: Toast.Style.Success,
          title: "メモを削除しました",
        });
        loadMemos();
      } catch (error) {
        console.error("メモ削除エラー:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "エラー",
          message: "メモの削除中にエラーが発生しました",
        });
      }
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="メモを検索">
      {memos.map((memo) => (
        <List.Item
          key={memo.path}
          title={memo.title}
          subtitle={
            memo.metadata.sfName
              ? `関連レコード: ${memo.metadata.sfType} - ${memo.metadata.sfName}`
              : ""
          }
          accessoryTitle={
            memo.metadata.createdAt
              ? new Date(memo.metadata.createdAt).toLocaleString()
              : ""
          }
          actions={
            <ActionPanel>
              <Action
                title="メモを表示"
                icon={Icon.Eye}
                onAction={() => push(<MemoDetail memo={memo} />)}
              />
              <Action
                title="メモを編集"
                icon={Icon.Pencil}
                onAction={() => push(<EditMemo memo={memo} />)}
              />
              <Action
                title="メモを削除"
                icon={Icon.Trash}
                onAction={() => deleteMemo(memo)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function MemoDetail({ memo }: { memo: MemoItem }) {
  const [isUploading, setIsUploading] = useState(false);
  const memoFileService = new MemoFileService();
  const salesforceService = new SalesforceService();
  const { push } = useNavigation();

  // メモの内容を読み込む（JSON形式）
  const { originalData } = memoFileService.readMemo(memo.path);

  // JSONデータを整形して表示用コンテンツを作成
  const createMarkdownContent = () => {
    if (!originalData) {
      return "メモデータを読み込めませんでした";
    }

    const typedData = originalData as unknown as MemoData;
    const title = typedData.title || "タイトルなし";
    const content = typedData.content || "";
    const metadata = typedData.metadata || {};
    const syncStatus = typedData.syncStatus || {
      lastSyncedAt: null,
      sfNoteId: null,
    };

    // メタデータセクション
    let metadataSection = "";
    if (metadata.sfId) {
      metadataSection += `\n\n## 関連レコード情報\n`;
      metadataSection += `- **タイプ**: ${metadata.sfType || "不明"}\n`;
      metadataSection += `- **名前**: ${metadata.sfName || "不明"}\n`;
      metadataSection += `- **ID**: ${metadata.sfId}\n`;
    }

    // 作成・更新日時
    let dateSection = "\n\n## 日時情報\n";
    if (metadata.createdAt) {
      dateSection += `- **作成日時**: ${new Date(metadata.createdAt).toLocaleString()}\n`;
    }
    if (metadata.updatedAt) {
      dateSection += `- **更新日時**: ${new Date(metadata.updatedAt).toLocaleString()}\n`;
    }

    // 同期情報
    let syncSection = "";
    if (syncStatus.lastSyncedAt) {
      syncSection += `\n\n## Salesforce同期情報\n`;
      syncSection += `- **最終同期**: ${new Date(syncStatus.lastSyncedAt).toLocaleString()}\n`;
      syncSection += `- **Salesforce ID**: ${syncStatus.sfNoteId || "不明"}\n`;
    }

    return `# ${title}\n\n${content}${metadataSection}${dateSection}${syncSection}`;
  };

  const markdownContent = createMarkdownContent();

  const uploadToSalesforce = async () => {
    setIsUploading(true);
    try {
      if (!originalData) {
        throw new Error("メモデータが読み込めません");
      }

      console.log("Salesforce送信前のメモデータ:", originalData);

      // 送信するタイトルと本文を取得
      const typedData = originalData as unknown as MemoData;
      const title = typedData.title || memo.title;
      const content = typedData.content || "";
      const metadata = typedData.metadata || {};

      // Salesforceにメモを作成
      const memoId = await salesforceService.createMemoRecord(
        title,
        content,
        metadata.sfId,
      );

      // 送信成功後、同期ステータスを更新
      const updated = memoFileService.updateSyncStatus(memo.path, memoId);
      if (updated) {
        console.log("同期ステータスを更新しました:", memoId);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "メモをSalesforceに送信しました",
        message: `メモID: ${memoId}`,
      });
    } catch (error) {
      console.error("Salesforce送信エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "送信エラー",
        message: "Salesforceへのメモ送信中にエラーが発生しました",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Detail
      markdown={markdownContent}
      isLoading={isUploading}
      actions={
        <ActionPanel>
          <Action
            title="Salesforceに送信"
            icon={Icon.Upload}
            onAction={uploadToSalesforce}
          />
          <Action
            title="メモを編集"
            icon={Icon.Pencil}
            onAction={() => push(<EditMemo memo={memo} />)}
          />
        </ActionPanel>
      }
    />
  );
}

// メモ編集コンポーネント
function EditMemo({ memo }: { memo: MemoItem }) {
  const memoFileService = new MemoFileService();
  const salesforceService = new SalesforceService();
  const { pop, push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [relatedRecord, setRelatedRecord] = useState<
    SalesforceRecord | undefined
  >(undefined);

  // メモの内容を読み込む
  const { metadata, originalData } = memoFileService.readMemo(memo.path);

  // 元のJSONデータがある場合はそれを使用
  const jsonData = originalData || {
    title: memo.title,
    content: "",
    metadata: metadata,
  };

  // 初期値設定
  const [title, setTitle] = useState(jsonData.title || memo.title);
  const [memoContent, setMemoContent] = useState(jsonData.content || "");

  // 関連レコードの初期設定
  useEffect(() => {
    // メタデータから関連レコード情報を取得
    const typedMetadata = metadata as MemoItem["metadata"];
    if (typedMetadata.sfId && typedMetadata.sfName && typedMetadata.sfType) {
      setRelatedRecord({
        Id: typedMetadata.sfId,
        Name: typedMetadata.sfName,
        Type: typedMetadata.sfType,
      });
    }
  }, [metadata]);

  // レコード検索画面を表示
  const handleRecordSelect = () => {
    push(<RecordSearch onRecordSelect={selectRecord} />);
  };

  // レコード選択時の処理
  const selectRecord = (record: SalesforceRecord) => {
    console.log("メモ編集画面でレコード設定:", record);
    setRelatedRecord(record);
  };

  // 関連レコードをクリア
  const clearRelatedRecord = () => {
    setRelatedRecord(undefined);
  };

  const handleSubmit = async (values: { title: string; content: string }) => {
    if (!values.title || !values.content) {
      await showToast({
        style: Toast.Style.Failure,
        title: "入力エラー",
        message: "タイトルと内容を入力してください",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 元のJSONデータを更新
      const updatedData = {
        ...jsonData,
        title: values.title,
        content: values.content,
        metadata: {
          ...(jsonData.metadata || {}),
          updatedAt: new Date().toISOString(),
        },
      } as {
        title: string;
        content: string;
        metadata: Record<string, unknown>;
      };

      // 関連レコード情報の更新
      if (relatedRecord) {
        updatedData.metadata = {
          ...updatedData.metadata,
          sfId: relatedRecord.Id,
          sfName: relatedRecord.Name,
          sfType: relatedRecord.Type,
        };
      } else {
        // 関連レコードがクリアされた場合、関連情報も削除
        const metadataObj = updatedData.metadata;
        if ("sfId" in metadataObj) {
          delete metadataObj["sfId"];
          delete metadataObj["sfName"];
          delete metadataObj["sfType"];
        }
      }

      // JSON文字列に変換
      const fileContent = JSON.stringify(updatedData, null, 2);

      // 同じファイルパスに上書き保存
      fs.writeFileSync(memo.path, fileContent, { encoding: "utf8" });

      // ファイル書き込み後に確認
      console.log(`メモ更新完了: ${memo.path} (JSON形式)`);

      await showToast({
        style: Toast.Style.Success,
        title: "メモを更新しました",
        message: "変更を保存しました",
      });

      // 前の画面に戻る
      pop();
    } catch (error) {
      console.error("メモ更新エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "メモの更新中にエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 現在の関連レコード表示用テキスト
  const relatedRecordText = relatedRecord
    ? `${relatedRecord.Type}: ${relatedRecord.Name}`
    : "なし";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="メモを保存"
            onSubmit={handleSubmit}
            icon={Icon.Document}
          />
          <Action
            title="関連レコードを選択"
            onAction={handleRecordSelect}
            icon={Icon.Link}
          />
          {relatedRecord && (
            <Action
              title="関連レコードをクリア"
              onAction={clearRelatedRecord}
              icon={Icon.Trash}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="タイトル"
        placeholder="メモのタイトルを入力"
        value={title as string}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextArea
        id="content"
        title="内容"
        placeholder="メモの内容を入力"
        value={memoContent as string}
        onChange={setMemoContent}
      />
      <Form.Description title="関連レコード" text={relatedRecordText} />
    </Form>
  );
}

// レコード検索コンポーネント (view-memosにも追加)
function RecordSearch({
  onRecordSelect,
}: {
  onRecordSelect: (record: SalesforceRecord) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<SalesforceRecord[]>([]);
  const salesforceService = new SalesforceService();
  const { pop } = useNavigation();

  const searchRecords = async () => {
    if (!searchText || searchText.length < 2) return;

    setIsLoading(true);
    try {
      const credentials = await salesforceService.getCredentials();
      if (!credentials) {
        await showToast({
          style: Toast.Style.Failure,
          title: "認証エラー",
          message: "Salesforceの認証情報が設定されていません",
        });
        return;
      }

      const searchResults = await salesforceService.searchRecords(searchText);
      setRecords(searchResults);
    } catch (error) {
      console.error("レコード検索エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "検索エラー",
        message: "レコードの検索中にエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchText.length >= 2) {
        searchRecords();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchText]);

  const handleRecordSelection = async (record: SalesforceRecord) => {
    console.log("レコード選択処理開始:", record);
    try {
      // レコード選択実行
      onRecordSelect(record);
      console.log("レコード選択完了");

      // 選択成功メッセージ
      await showToast({
        style: Toast.Style.Success,
        title: "レコードを選択しました",
        message: `[${record.Type}] ${record.Name}`,
      });

      // 少し待機して確実にレコード情報が設定されるようにする
      setTimeout(() => {
        // 前の画面（メモ編集画面）に戻る
        console.log("前の画面に戻ります");
        pop();
      }, 300);
    } catch (error) {
      console.error("レコード選択エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: `レコード選択処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="レコードを検索"
      onSearchTextChange={setSearchText}
      throttle
    >
      {records.map((record) => (
        <List.Item
          key={record.Id}
          title={`[${record.Type}] ${record.Name}`}
          subtitle={`ID: ${record.Id}`}
          accessoryTitle=""
          icon={getObjectIcon(record.Type)}
          actions={
            <ActionPanel>
              <Action
                title="このレコードを選択"
                onAction={() => handleRecordSelection(record)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// オブジェクトタイプに基づいてアイコンを返す関数
function getObjectIcon(objectType: string): Icon {
  switch (objectType.toLowerCase()) {
    case "account":
      return Icon.Building;
    case "contact":
      return Icon.Person;
    case "opportunity":
      return Icon.Star;
    case "lead":
      return Icon.Bookmark;
    case "case":
      return Icon.Box;
    case "task":
      return Icon.CheckCircle;
    case "cs__c":
      return Icon.Tag;
    default:
      return Icon.Document;
  }
}
