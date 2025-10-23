import { getPreferenceValues, LocalStorage } from "@raycast/api";

type Prefs = {
  larkDomain?: string;
  appId?: string;
  appSecret?: string;
  receiveIdType?: "email" | "open_id" | "chat_id";
  receiveId?: string;
  prefixTimestamp?: boolean;
};

/**
 * LocalStorageからExtension Preferencesに設定を提案
 */
export async function suggestSettingsToPreferences(): Promise<string> {
  try {
    // LocalStorageから現在の設定を取得
    const [larkDomain, appId, appSecret, receiveIdType, receiveId, prefixTimestamp] =
      await Promise.all([
        LocalStorage.getItem<string>("larkDomain"),
        LocalStorage.getItem<string>("appId"),
        LocalStorage.getItem<string>("appSecret"),
        LocalStorage.getItem<string>("receiveIdType"),
        LocalStorage.getItem<string>("receiveId"),
        LocalStorage.getItem<string>("prefixTimestamp"),
      ]);

    // Extension Preferences用の設定テキストを生成
    const settingsText = `FlashLarkPost - 設定値一覧

Lark Domain: ${larkDomain || "https://open.larksuite.com"}
App ID: ${appId || "(未設定)"}
App Secret: ${appSecret || "(未設定)"}
Receive ID Type: ${receiveIdType || "email"}
Receive ID: ${receiveId || "(未設定)"}
Prefix Timestamp: ${prefixTimestamp === "true" ? "ON (チェック)" : "OFF (チェックなし)"}

--- Extension Preferencesでの設定方法 ---
1. 上記の値を各フィールドにコピー＆ペースト
2. Prefix Timestampは${prefixTimestamp === "true" ? "チェックを入れる" : "チェックを外す"}
3. 設定後はExtension Preferencesが優先されます`;

    return settingsText;
  } catch (error) {
    console.error("設定提案エラー:", error);
    return "設定の読み込みに失敗しました";
  }
}

/**
 * Extension PreferencesからLocalStorageに設定を同期
 */
export async function syncPreferencesToLocalStorage(): Promise<boolean> {
  try {
    const prefs = getPreferenceValues<Prefs>();

    // Extension Preferencesに設定がある場合のみLocalStorageに同期
    if (prefs.appId && prefs.appSecret && prefs.receiveId) {
      await LocalStorage.setItem("larkDomain", prefs.larkDomain || "https://open.larksuite.com");
      await LocalStorage.setItem("appId", prefs.appId);
      await LocalStorage.setItem("appSecret", prefs.appSecret);
      await LocalStorage.setItem("receiveIdType", prefs.receiveIdType || "email");
      await LocalStorage.setItem("receiveId", prefs.receiveId);
      await LocalStorage.setItem("prefixTimestamp", (prefs.prefixTimestamp === true).toString());

      console.log("✅ Extension PreferencesからLocalStorageに設定を同期しました");
      return true;
    }

    console.log("⚠️ Extension Preferencesに十分な設定がありません");
    return false;
  } catch (error) {
    console.error("設定同期エラー:", error);
    return false;
  }
}

/**
 * 設定の状況を確認
 */
export async function checkSettingsStatus(): Promise<{
  hasLocalStorage: boolean;
  hasPreferences: boolean;
  recommendAction: "use_localStorage" | "use_preferences" | "setup_needed";
}> {
  try {
    // LocalStorageの設定を確認
    const [lsAppId, lsAppSecret, lsReceiveId] = await Promise.all([
      LocalStorage.getItem<string>("appId"),
      LocalStorage.getItem<string>("appSecret"),
      LocalStorage.getItem<string>("receiveId"),
    ]);

    const hasLocalStorage = !!(lsAppId && lsAppSecret && lsReceiveId);

    // Extension Preferencesの設定を確認
    const prefs = getPreferenceValues<Prefs>();
    const hasPreferences = !!(prefs.appId && prefs.appSecret && prefs.receiveId);

    // 推奨アクションを決定
    let recommendAction: "use_localStorage" | "use_preferences" | "setup_needed";
    if (hasPreferences) {
      recommendAction = "use_preferences";
    } else if (hasLocalStorage) {
      recommendAction = "use_localStorage";
    } else {
      recommendAction = "setup_needed";
    }

    return {
      hasLocalStorage,
      hasPreferences,
      recommendAction,
    };
  } catch (error) {
    console.error("設定状況確認エラー:", error);
    return {
      hasLocalStorage: false,
      hasPreferences: false,
      recommendAction: "setup_needed",
    };
  }
}
