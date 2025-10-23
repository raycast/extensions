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
 * 設定値を取得します。LocalStorageとPreferencesの両方から読み込み、
 * LocalStorageの値がある場合は優先します。
 */
export async function getEffectivePreferences(): Promise<Prefs> {
  try {
    // Extension Preferencesから基本設定を取得
    const extensionPrefs = getPreferenceValues<Prefs>();

    // LocalStorageから設定を取得（オンボーディングで保存された値）
    const [larkDomain, appId, appSecret, receiveIdType, receiveId, prefixTimestamp] =
      await Promise.all([
        LocalStorage.getItem<string>("larkDomain"),
        LocalStorage.getItem<string>("appId"),
        LocalStorage.getItem<string>("appSecret"),
        LocalStorage.getItem<string>("receiveIdType"),
        LocalStorage.getItem<string>("receiveId"),
        LocalStorage.getItem<string>("prefixTimestamp"),
      ]);

    // Extension Preferencesが設定されている場合は優先、なければLocalStorageから読み込み
    const effectivePrefs: Prefs = {
      larkDomain: extensionPrefs.larkDomain || larkDomain || "https://open.larksuite.com",
      appId: extensionPrefs.appId || appId,
      appSecret: extensionPrefs.appSecret || appSecret,
      receiveIdType:
        extensionPrefs.receiveIdType ||
        (receiveIdType as "email" | "open_id" | "chat_id") ||
        "email",
      receiveId: extensionPrefs.receiveId || receiveId,
      prefixTimestamp:
        extensionPrefs.prefixTimestamp !== undefined && extensionPrefs.prefixTimestamp !== null
          ? extensionPrefs.prefixTimestamp === true
          : prefixTimestamp === "true",
    };

    console.log("📊 LocalStorage values:", {
      prefixTimestamp,
      prefixTimestampType: typeof prefixTimestamp,
    });
    console.log("📊 Extension preferences:", {
      prefixTimestamp: extensionPrefs.prefixTimestamp,
    });
    console.log("📊 Effective preferences:", {
      ...effectivePrefs,
      appSecret: effectivePrefs.appSecret ? "***" : undefined,
    });

    return effectivePrefs;
  } catch (error) {
    console.error("Failed to get effective preferences:", error);
    // フォールバックとしてExtension Preferencesのみを返す
    return getPreferenceValues<Prefs>();
  }
}

/**
 * 設定が完全に設定されているかチェックします
 */
export async function isEffectiveSetupComplete(): Promise<boolean> {
  try {
    const prefs = await getEffectivePreferences();

    const requiredFields = [
      prefs.larkDomain,
      prefs.appId,
      prefs.appSecret,
      prefs.receiveId,
      prefs.receiveIdType,
    ];

    const isComplete = requiredFields.every(
      (field) => field !== undefined && field !== "" && field.toString().trim() !== ""
    );

    console.log("✅ Setup completion check:", {
      isComplete,
      hasAppId: !!prefs.appId,
      hasAppSecret: !!prefs.appSecret,
      hasReceiveId: !!prefs.receiveId,
    });

    return isComplete;
  } catch (error) {
    console.error("Failed to check setup completion:", error);
    return false;
  }
}
