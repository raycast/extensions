import { getPreferenceValues } from "@raycast/api";

type Prefs = {
  larkDomain?: string;
  appId?: string;
  appSecret?: string;
  receiveIdType?: "email" | "open_id" | "chat_id";
  receiveId?: string;
  prefixTimestamp?: boolean;
};

export function isSetupComplete(): boolean {
  try {
    const prefs = getPreferenceValues<Prefs>();

    // Check if all required preferences are set
    const requiredFields = [
      prefs.larkDomain,
      prefs.appId,
      prefs.appSecret,
      prefs.receiveId,
      prefs.receiveIdType,
    ];

    return requiredFields.every(
      (field) => field !== undefined && field !== "" && field.toString().trim() !== ""
    );
  } catch {
    // If preferences are not accessible, setup is not complete
    return false;
  }
}

export function getSetupStatus(): {
  isComplete: boolean;
  missingFields: string[];
  suggestions: string[];
} {
  try {
    const prefs = getPreferenceValues<Prefs>();
    const missingFields: string[] = [];
    const suggestions: string[] = [];

    if (!prefs.larkDomain || prefs.larkDomain.trim() === "") {
      missingFields.push("Lark Domain");
      suggestions.push("Lark/Feishuの環境を選択してください");
    }

    if (!prefs.appId || prefs.appId.trim() === "") {
      missingFields.push("App ID");
      suggestions.push("Lark開発者コンソールからApp IDをコピーしてください");
    }

    if (!prefs.appSecret || prefs.appSecret.trim() === "") {
      missingFields.push("App Secret");
      suggestions.push("Lark開発者コンソールからApp Secretをコピーしてください");
    }

    if (!prefs.receiveId || prefs.receiveId.trim() === "") {
      missingFields.push("Receive ID");
      suggestions.push("あなたのLarkログインメールアドレスを入力してください");
    }

    if (!prefs.receiveIdType) {
      missingFields.push("Receive ID Type");
      suggestions.push("メールアドレス形式を選択してください");
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      suggestions,
    };
  } catch {
    return {
      isComplete: false,
      missingFields: ["All preferences"],
      suggestions: ["初期設定が必要です"],
    };
  }
}

export function hasEverRunSetup(): boolean {
  try {
    const prefs = getPreferenceValues<Prefs>();
    // If any preference is set, user has attempted setup
    return !!(prefs.appId || prefs.appSecret || prefs.receiveId);
  } catch {
    return false;
  }
}
