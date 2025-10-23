import { LocalStorage } from "@raycast/api";

/**
 * 初回起動状態を再現するために全ての保存されたデータをクリアします
 * テスト用途のみで使用してください
 */
export async function clearAllStoredData(): Promise<void> {
  try {
    // 言語設定をクリア
    await LocalStorage.removeItem("preferred-language");

    console.log("✅ 保存されたデータをクリアしました");
    console.log("- 言語設定: クリア済み");
    console.log("- Extension Preferences: 手動でクリアしてください");
  } catch (error) {
    console.error("❌ データクリア中にエラーが発生しました:", error);
  }
}

/**
 * 現在の設定状態を表示します
 */
export async function showCurrentSettings(): Promise<void> {
  try {
    const language = await LocalStorage.getItem<string>("preferred-language");

    console.log("📊 現在の設定状態:");
    console.log(`- 言語設定: ${language || "未設定"}`);
  } catch (error) {
    console.error("❌ 設定確認中にエラーが発生しました:", error);
  }
}

/**
 * テスト用の言語設定を行います
 */
export async function setTestLanguage(language: "ja" | "en"): Promise<void> {
  try {
    await LocalStorage.setItem("preferred-language", language);
    console.log(`✅ テスト用言語を設定しました: ${language}`);
  } catch (error) {
    console.error("❌ 言語設定中にエラーが発生しました:", error);
  }
}
