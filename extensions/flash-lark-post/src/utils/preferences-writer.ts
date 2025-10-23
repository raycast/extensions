import { LocalStorage } from "@raycast/api";

/**
 * Extension Preferencesに設定を書き込む
 * macOSのdefaultsコマンドを使用してRaycastの設定を直接更新
 */
export async function writeToExtensionPreferences(settings: {
  larkDomain: string;
  appId: string;
  appSecret: string;
  receiveIdType: string;
  receiveId: string;
  prefixTimestamp: boolean;
}): Promise<void> {
  try {
    console.log("🔧 設定をLocalStorageに保存中...");

    // LocalStorageに確実に保存（Extension Preferencesの直接操作は危険なため無効化）
    await LocalStorage.setItem("larkDomain", settings.larkDomain);
    await LocalStorage.setItem("appId", settings.appId);
    await LocalStorage.setItem("appSecret", settings.appSecret);
    await LocalStorage.setItem("receiveIdType", settings.receiveIdType);
    await LocalStorage.setItem("receiveId", settings.receiveId);
    await LocalStorage.setItem("prefixTimestamp", settings.prefixTimestamp.toString());

    console.log("✅ LocalStorageに設定を保存しました");
    console.log("💡 手動でExtension Preferencesに設定をコピーすることもできます");

    // Extension Preferencesへの直接書き込みは安全性のため無効化
    // ユーザーには手動設定を推奨
  } catch (error) {
    console.error("❌ 設定保存エラー:", error);
    throw error;
  }
}

/**
 * Extension Preferencesから設定を読み込む
 */
export function readFromExtensionPreferences(): any {
  try {
    // 環境変数から読み込み
    return {
      larkDomain: process.env.LARK_DOMAIN || "",
      appId: process.env.LARK_APP_ID || "",
      appSecret: process.env.LARK_APP_SECRET || "",
      receiveIdType: process.env.LARK_RECEIVE_ID_TYPE || "email",
      receiveId: process.env.LARK_RECEIVE_ID || "",
      prefixTimestamp: process.env.LARK_PREFIX_TIMESTAMP === "true",
    };
  } catch (error) {
    console.error("Extension Preferences読み込みエラー:", error);
    return {};
  }
}
