/* eslint-disable */
import React, { useState } from "react";
import {
  ActionPanel,
  Form,
  Action,
  showToast,
  Toast,
  Icon,
  Detail,
  useNavigation,
  List,
} from "@raycast/api";
import {
  SalesforceService,
  MemoFileService,
  SalesforceRecord,
} from "./utils/salesforce";

// メモデータの型定義
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

export default function CreateMemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [relatedRecord, setRelatedRecord] = useState<
    SalesforceRecord | undefined
  >(undefined);
  const { push } = useNavigation();

  const memoFileService = new MemoFileService();

  const handleRecordSelect = () => {
    push(<RecordSearch onRecordSelect={selectRecord} />);
  };

  const selectRecord = (record: SalesforceRecord) => {
    console.log("メイン画面でレコード設定:", record);
    setRelatedRecord(record);
    // 直接ログ出力（setTimeout不要）
    console.log("メイン画面でレコード選択完了:", { record });
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
      // メモをローカルに保存
      const filePath = await memoFileService.saveMemo(
        values.title,
        values.content,
        relatedRecord,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "メモを保存しました",
        message: "ローカルに保存しました",
      });

      // 詳細画面に遷移して、メモとSalesforceへの送信ボタンを表示
      push(
        <MemoDetail
          title={values.title}
          content={values.content}
          filePath={filePath}
          relatedRecord={relatedRecord}
        />,
      );
    } catch (error) {
      console.error("メモ保存エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "メモの保存中にエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="タイトル"
        placeholder="メモのタイトルを入力"
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextArea
        id="content"
        title="内容"
        placeholder="メモの内容を入力"
        value={content}
        onChange={setContent}
      />
      <Form.Description title="関連レコード" text={relatedRecordText} />
    </Form>
  );
}

// レコード検索コンポーネント
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

      // 前の画面に即時に戻る
      console.log("前の画面に戻ります");
      pop();
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

// メモ詳細表示と送信コンポーネント
function MemoDetail({
  title,
  content,
  filePath,
  relatedRecord,
}: {
  title: string;
  content: string;
  filePath: string;
  relatedRecord?: SalesforceRecord;
}) {
  const [, setIsUploading] = useState(false);
  const salesforceService = new SalesforceService();
  const memoFileService = new MemoFileService();

  const uploadToSalesforce = async () => {
    setIsUploading(true);
    try {
      // 最新のメモデータを読み込む
      const { originalData } = memoFileService.readMemo(filePath);

      if (!originalData) {
        throw new Error("メモデータが読み込めません");
      }

      console.log("Salesforce送信前のメモデータ:", originalData);

      // Salesforceにメモを作成
      const typedData = originalData as unknown as MemoData;
      const memoId = await salesforceService.createMemoRecord(
        typedData.title || title,
        typedData.content || content,
        relatedRecord?.Id,
      );

      // 送信成功後、同期ステータスを更新
      const updated = await memoFileService.updateSyncStatus(filePath, memoId);
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

  // JSONデータを整形して表示用コンテンツを作成
  const createMarkdownContent = () => {
    try {
      // ファイルからJSONデータを読み込む
      const { originalData } = memoFileService.readMemo(filePath);

      if (!originalData) {
        return `# ${title}\n\n${content}\n\n---\n\n**ファイル保存場所**: ${filePath}\n${relatedRecord ? `**関連レコード**: ${relatedRecord.Type} - ${relatedRecord.Name} (${relatedRecord.Id})` : ""}`;
      }

      const typedData = originalData as unknown as MemoData;
      const jsonTitle = typedData.title || title;
      const jsonContent = typedData.content || content;
      const metadata = typedData.metadata || {};

      // メタデータセクション
      let metadataSection = "";
      if (relatedRecord || metadata.sfId) {
        metadataSection += `\n\n## 関連レコード情報\n`;
        if (relatedRecord) {
          metadataSection += `- **タイプ**: ${relatedRecord.Type || "不明"}\n`;
          metadataSection += `- **名前**: ${relatedRecord.Name || "不明"}\n`;
          metadataSection += `- **ID**: ${relatedRecord.Id}\n`;
        } else if (metadata.sfId) {
          metadataSection += `- **タイプ**: ${metadata.sfType || "不明"}\n`;
          metadataSection += `- **名前**: ${metadata.sfName || "不明"}\n`;
          metadataSection += `- **ID**: ${metadata.sfId}\n`;
        }
      }

      // 作成・更新日時
      let dateSection = "\n\n## 日時情報\n";
      if (metadata.createdAt) {
        dateSection += `- **作成日時**: ${new Date(metadata.createdAt).toLocaleString()}\n`;
      }
      if (metadata.updatedAt) {
        dateSection += `- **更新日時**: ${new Date(metadata.updatedAt).toLocaleString()}\n`;
      }

      return `# ${jsonTitle}\n\n${jsonContent}\n\n---\n\n**ファイル保存場所**: ${filePath}\n${relatedRecord ? `**関連レコード**: ${relatedRecord.Type} - ${relatedRecord.Name} (${relatedRecord.Id})` : ""}\n${metadataSection}\n${dateSection}`;
    } catch (error) {
      console.error("マークダウンコンテンツ作成エラー:", error);
      return `# ${title}\n\n${content}\n\n---\n\n**ファイル保存場所**: ${filePath}\n${relatedRecord ? `**関連レコード**: ${relatedRecord.Type} - ${relatedRecord.Name} (${relatedRecord.Id})` : ""}`;
    }
  };

  return (
    <Detail
      markdown={createMarkdownContent()}
      actions={
        <ActionPanel>
          <Action
            title="Salesforceに送信"
            onAction={uploadToSalesforce}
            icon={Icon.Upload}
          />
        </ActionPanel>
      }
    />
  );
}
