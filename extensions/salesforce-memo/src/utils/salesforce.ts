import jsforce from "jsforce";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import fs from "fs";
import path from "path";

interface Preferences {
  salesforceUrl: string;
  memoDirectory: string;
  salesforceObjectType: string;
  customObjectName: string;
}

interface SalesforceCredentials {
  username: string;
  password: string;
  securityToken: string;
}

// Salesforceレコードの属性型
interface SalesforceAttributes {
  type?: string;
  url?: string;
}

// Salesforceレコードの型
interface SalesforceRecordData {
  Id: string;
  Name: string;
  attributes?: SalesforceAttributes;
  [key: string]: unknown;
}

export interface SalesforceRecord {
  Id: string;
  Name: string;
  Type: string;
}

// Salesforce接続関連のクラス
export class SalesforceService {
  private conn: jsforce.Connection | null = null;
  private preferences: Preferences;

  constructor() {
    this.preferences = getPreferenceValues<Preferences>();
  }

  // 使用するSalesforceオブジェクトの名前を取得
  private getSalesforceObjectName(): string {
    const { salesforceObjectType, customObjectName } = this.preferences;

    if (salesforceObjectType === "Custom" && customObjectName) {
      return customObjectName;
    }

    return salesforceObjectType || "ContentNote"; // デフォルトはContentNote
  }

  // ログイン情報を保存
  async saveCredentials(credentials: SalesforceCredentials): Promise<void> {
    await LocalStorage.setItem("salesforce_credentials", JSON.stringify(credentials));
  }

  // ログイン情報を取得
  async getCredentials(): Promise<SalesforceCredentials | null> {
    const storedCredentials = await LocalStorage.getItem<string>("salesforce_credentials");
    if (!storedCredentials) {
      return null;
    }
    return JSON.parse(storedCredentials);
  }

  // Salesforceに接続
  async connect(): Promise<boolean> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      return false;
    }

    try {
      this.conn = new jsforce.Connection({
        loginUrl: this.preferences.salesforceUrl || "https://login.salesforce.com",
      });

      // UTF-8エンコーディングを使用するように設定
      if (this.conn && this.conn.request) {
        // リクエストヘッダーに文字セット情報を追加
        this.conn.request.headers = {
          ...this.conn.request.headers,
          "Accept-Charset": "utf-8",
          "Content-Type": "application/json; charset=utf-8",
        };

        // APIバージョン情報をログに出力（デバッグ用）
        console.log("Salesforce API接続設定完了");
      }

      // ログイン処理
      console.log("Salesforceログイン開始");
      await this.conn.login(credentials.username, credentials.password + (credentials.securityToken || ""));

      // 接続成功後にログ出力
      console.log("Salesforceに接続しました。");

      return true;
    } catch (error) {
      console.error("Salesforce connection error:", error);
      return false;
    }
  }

  // レコード検索
  async searchRecords(searchTerm: string): Promise<SalesforceRecord[]> {
    if (!this.conn) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error("Salesforceに接続できませんでした。");
      }
    }

    try {
      const result = await this.conn!.search(
        `FIND {${searchTerm}} IN ALL FIELDS RETURNING CS__c(Id, Name), Contact(Id, Name), Opportunity(Id, Name), Lead(Id, Name)`,
      );

      // 検索結果を統合して返す
      const records: SalesforceRecord[] = [];

      if (result.searchRecords) {
        console.log("検索結果:", JSON.stringify(result.searchRecords, null, 2));

        for (const record of result.searchRecords as SalesforceRecordData[]) {
          // SOSLの結果には各レコードのオブジェクト型を表す属性が含まれているはず
          console.log("レコード詳細:", JSON.stringify(record, null, 2));

          // 改善: 複数の方法でオブジェクト型を特定
          let objectType = "";

          // 方法1: AttributesからTypeを取得
          if (record.attributes && record.attributes.type) {
            objectType = record.attributes.type;
          }
          // 方法2: レコード名にTypeが含まれる属性を探す
          else {
            const typeField = Object.keys(record).find((key) => key.endsWith("Type"));
            if (typeField) {
              objectType = typeField.replace("Type", "");
            }
            // 方法3: URLから推測
            else if (record.attributes && record.attributes.url) {
              const urlMatch = record.attributes.url.match(/\/sobjects\/(\w+)\//);
              if (urlMatch && urlMatch[1]) {
                objectType = urlMatch[1];
              }
            }
          }

          // どの方法でも取得できなかった場合はUnknownとする
          if (!objectType) {
            objectType = "Unknown";
          }

          records.push({
            Id: record.Id,
            Name: record.Name,
            Type: objectType,
          });
        }
      }

      return records;
    } catch (error) {
      console.error("Salesforceレコード検索エラー:", error);
      throw new Error("レコードの検索中にエラーが発生しました。");
    }
  }

  // メモレコードを作成
  async createMemoRecord(subject: string, body: string, relatedRecordId?: string): Promise<string> {
    if (!this.conn) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error("Salesforceに接続できませんでした。");
      }
    }

    try {
      console.log("Salesforceメモ作成開始:", { subject, bodyLength: body.length, relatedRecordId });

      // 文字化け防止のための処理
      // タイトルと本文をエンコードして送信
      const safeSubject = subject.trim();
      const safeBody = body.trim();

      console.log(`タイトル長: ${Buffer.from(safeSubject).length} バイト`);
      console.log(`本文長: ${Buffer.from(safeBody).length} バイト`);

      // Salesforceオブジェクトの作成
      const objectName = this.getSalesforceObjectName();
      console.log(`${objectName}レコード作成準備`);

      // Salesforceオブジェクトのフィールド
      const memoData: Record<string, string> = {
        Title: safeSubject,
      };

      // 本文をBase64でエンコード（日本語文字の文字化け対策）
      try {
        // すべてのメモコンテンツをBase64エンコードして設定
        console.log("コンテンツをBase64エンコードします");
        const contentBuffer = Buffer.from(safeBody, "utf8");
        memoData.Content = contentBuffer.toString("base64");
        console.log("Base64エンコード完了:", {
          contentLengthBefore: safeBody.length,
          contentLengthAfter: memoData.Content.length,
        });
      } catch (encodeError) {
        console.error("Base64エンコードエラー:", encodeError);
        // エンコードエラーの場合は直接テキストを設定（フォールバック）
        memoData.Content = safeBody;
      }

      // Salesforce API実行時の詳細ログ
      console.log(`${objectName}作成リクエスト準備:`, {
        title: memoData.Title,
        contentLength: memoData.Content?.length,
      });

      // Salesforceレコード作成
      const result = await this.conn!.sobject(objectName).create(memoData);
      console.log(`${objectName}作成レスポンス:`, JSON.stringify(result));

      if (result.success) {
        // 関連レコードがある場合はContentDocumentLinkを作成
        if (relatedRecordId) {
          try {
            // 選択したオブジェクトがContentNoteかContentDocumentの場合のみContentDocumentLinkを作成
            if (objectName === "ContentNote" || objectName === "ContentDocument") {
              // ContentDocumentLinkオブジェクトを作成して関連付け
              console.log("ContentDocumentLink作成開始:", {
                contentDocumentId: result.id,
                linkedEntityId: relatedRecordId,
              });

              const linkData = {
                ContentDocumentId: result.id,
                LinkedEntityId: relatedRecordId,
                ShareType: "V", // V=Viewer
              };

              const linkResult = await this.conn!.sobject("ContentDocumentLink").create(linkData);
              console.log("ContentDocumentLink作成結果:", JSON.stringify(linkResult));

              if (!linkResult.success) {
                console.error("関連レコードのリンク作成に失敗:", linkResult);
              }
            } else if (objectName === "Task") {
              // Taskの場合はWhatIdを使用して関連付け
              await this.conn!.sobject("Task").update({
                Id: result.id,
                WhatId: relatedRecordId,
              });
              console.log("Task関連付け完了:", relatedRecordId);
            } else {
              // カスタムオブジェクトの場合は必要に応じて関連付けロジックを実装
              console.log("カスタムオブジェクトの関連付けはサポートされていません");
            }
          } catch (linkError) {
            console.error("関連レコードのリンク作成エラー:", linkError);
            // メイン処理は続行（メモ自体は作成できている）
          }
        }

        return result.id as string;
      } else {
        console.error(`${objectName}作成失敗:`, result);
        throw new Error(`メモの作成に失敗しました: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.error("Salesforceメモ作成エラー:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`メモの作成中にエラーが発生しました: ${errorMessage}`);
    }
  }
}

// ローカルファイル関連のユーティリティ
export class MemoFileService {
  private preferences: Preferences;

  constructor() {
    this.preferences = getPreferenceValues<Preferences>();
  }

  // メモをローカルに保存（JSON形式）
  saveMemo(title: string, content: string, relatedRecord?: SalesforceRecord): string {
    const memoDir = this.preferences.memoDirectory;

    // タイムスタンプをファイル名に使用
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // ファイル名は日本語を避けて英数字だけにする
    const safeName = `memo_${timestamp}`;
    const fileName = `${safeName}.json`;
    const filePath = path.join(memoDir, fileName);

    // JSONデータ構造を作成
    const memoData: Record<string, unknown> = {
      title: title,
      content: content,
      metadata: {
        createdAt: new Date().toISOString(),
      },
      syncStatus: {
        lastSyncedAt: null,
        sfNoteId: null,
      },
    };

    // 関連レコードがある場合は追加
    if (relatedRecord) {
      memoData.metadata = {
        createdAt: (memoData.metadata as { createdAt: string }).createdAt,
        sfId: relatedRecord.Id,
        sfName: relatedRecord.Name,
        sfType: relatedRecord.Type,
      };
    }

    // JSON文字列に変換
    const jsonContent = JSON.stringify(memoData, null, 2);

    // UTF-8で保存
    fs.writeFileSync(filePath, jsonContent, { encoding: "utf8" });

    // ファイル書き込み後に確認
    console.log(`JSONファイル保存完了: ${filePath} (UTF-8形式)`);

    return filePath;
  }

  // 保存済みのメモを読み込む（JSON形式のみに対応）
  readMemo(filePath: string): {
    content: string;
    metadata: Record<string, unknown>;
    originalData?: Record<string, unknown>;
  } {
    try {
      // ファイル拡張子を確認
      if (!filePath.toLowerCase().endsWith(".json")) {
        console.error("非対応ファイル形式:", filePath);
        return { content: "非対応ファイル形式です", metadata: {} };
      }

      // UTF-8で読み込み
      const fileContent = fs.readFileSync(filePath, { encoding: "utf8" });

      // デバッグ情報
      console.log(`ファイル読み込み: ${filePath} (UTF-8形式)`);

      // BOMがある場合は除去
      const content = fileContent.charCodeAt(0) === 0xfeff ? fileContent.substring(1) : fileContent;

      // JSONデータを解析
      try {
        const memoData = JSON.parse(content);
        console.log("JSONデータを解析しました:", {
          title: memoData.title,
          contentLength: memoData.content?.length,
          metadata: memoData.metadata,
        });

        // マークダウン形式に変換して返す（表示用）
        return {
          content: `# ${memoData.title}\n\n${memoData.content || ""}`,
          metadata: memoData.metadata || {},
          originalData: memoData, // 元のJSONデータも返す（編集時に使用）
        };
      } catch (jsonError) {
        console.error("JSONパースエラー:", jsonError);
        return { content: "JSONパースエラー", metadata: {} };
      }
    } catch (error) {
      console.error(`ファイル読み込みエラー (${filePath}):`, error);
      return { content: "", metadata: {} };
    }
  }

  // Salesforceに送信後、送信ステータスを更新
  updateSyncStatus(filePath: string, sfNoteId: string): boolean {
    try {
      // ファイル拡張子を確認
      const isJsonFile = filePath.toLowerCase().endsWith(".json");

      if (!isJsonFile) {
        console.log("Markdownファイルの同期ステータス更新はサポートしていません");
        return false;
      }

      // ファイル読み込み
      const fileContent = fs.readFileSync(filePath, { encoding: "utf8" });
      const content = fileContent.charCodeAt(0) === 0xfeff ? fileContent.substring(1) : fileContent;

      // JSONデータ解析と更新
      try {
        const memoData = JSON.parse(content);
        memoData.syncStatus = {
          lastSyncedAt: new Date().toISOString(),
          sfNoteId: sfNoteId,
        };

        // 更新したデータを保存
        const updatedContent = JSON.stringify(memoData, null, 2);
        fs.writeFileSync(filePath, updatedContent, { encoding: "utf8" });

        console.log(`同期ステータスを更新しました: ${filePath}, sfNoteId=${sfNoteId}`);
        return true;
      } catch (jsonError) {
        console.error("JSON更新エラー:", jsonError);
        return false;
      }
    } catch (error) {
      console.error(`同期ステータス更新エラー (${filePath}):`, error);
      return false;
    }
  }

  // 保存済みのメモ一覧を取得
  listMemos(): string[] {
    const memoDir = this.preferences.memoDirectory;
    try {
      return fs
        .readdirSync(memoDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.join(memoDir, file));
    } catch (error) {
      console.error("メモ一覧取得エラー:", error);
      return [];
    }
  }
}
