import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
  LocalStorage,
  Detail,
  Icon,
  openExtensionPreferences,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getEffectivePreferences } from "./utils/preferences";
import { suggestSettingsToPreferences } from "./utils/settings-sync";

type SettingsState = {
  larkDomain: string;
  appId: string;
  appSecret: string;
  receiveIdType: "email" | "open_id" | "chat_id";
  receiveId: string;
  prefixTimestamp: boolean;
  isLoading: boolean;
};

export default function SettingsManager() {
  const { pop } = useNavigation();
  const [state, setState] = useState<SettingsState>({
    larkDomain: "https://open.larksuite.com",
    appId: "",
    appSecret: "",
    receiveIdType: "email",
    receiveId: "",
    prefixTimestamp: false,
    isLoading: true,
  });

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const prefs = await getEffectivePreferences();
      setState({
        larkDomain: prefs.larkDomain || "https://open.larksuite.com",
        appId: prefs.appId || "",
        appSecret: prefs.appSecret || "",
        receiveIdType: prefs.receiveIdType || "email",
        receiveId: prefs.receiveId || "",
        prefixTimestamp: prefs.prefixTimestamp || false,
        isLoading: false,
      });
    } catch (error) {
      console.error("設定読み込みエラー:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const saveSettings = async (values: any) => {
    try {
      // LocalStorageに保存
      await LocalStorage.setItem("larkDomain", values.larkDomain);
      await LocalStorage.setItem("appId", values.appId);
      await LocalStorage.setItem("appSecret", values.appSecret);
      await LocalStorage.setItem("receiveIdType", values.receiveIdType);
      await LocalStorage.setItem("receiveId", values.receiveId);
      await LocalStorage.setItem("prefixTimestamp", values.prefixTimestamp.toString());

      showToast({
        style: Toast.Style.Success,
        title: "✅ 設定を保存しました",
        message: "LocalStorageに保存されました",
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "❌ 保存に失敗しました",
        message: String(error),
      });
    }
  };

  const copyToExtensionPreferences = async () => {
    const settingsText = await suggestSettingsToPreferences();
    await Clipboard.copy(settingsText);
    showToast({
      style: Toast.Style.Success,
      title: "📋 設定をコピーしました",
      message: "Extension Preferencesで設定してください",
    });
    setTimeout(() => openExtensionPreferences(), 2000);
  };

  if (state.isLoading) {
    return <Detail markdown="設定を読み込み中..." />;
  }

  return (
    <Form
      navigationTitle="連携設定"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="設定を保存" icon={Icon.Check} onSubmit={saveSettings} />
          <Action
            title="Extension Preferencesにコピー"
            icon={Icon.Clipboard}
            onAction={copyToExtensionPreferences}
          />
          <Action
            title="Extension Preferencesを開く"
            icon={Icon.Gear}
            onAction={() => openExtensionPreferences()}
          />
          <Action
            title="キャンセル"
            icon={Icon.XMarkCircle}
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Lark/Feishuとの連携に必要な設定を管理します" />

      <Form.Separator />
      <Form.Description text="🔗 API設定" />

      <Form.Dropdown
        id="larkDomain"
        title="Lark Domain"
        value={state.larkDomain}
        onChange={(value) => setState({ ...state, larkDomain: value })}
        info="使用するLark/Feishuの環境を選択"
      >
        <Form.Dropdown.Item
          value="https://open.larksuite.com"
          title="Global (open.larksuite.com)"
        />
        <Form.Dropdown.Item value="https://open.feishu.cn" title="China (open.feishu.cn)" />
      </Form.Dropdown>

      <Form.PasswordField
        id="appId"
        title="App ID"
        placeholder="cli_xxxxxxxxxx"
        value={state.appId}
        onChange={(value) => setState({ ...state, appId: value })}
        info="Lark Developer ConsoleのApp ID"
      />

      <Form.PasswordField
        id="appSecret"
        title="App Secret"
        placeholder="********************************"
        value={state.appSecret}
        onChange={(value) => setState({ ...state, appSecret: value })}
        info="Lark Developer ConsoleのApp Secret"
      />

      <Form.Separator />
      <Form.Description text="📬 送信先設定" />

      <Form.Dropdown
        id="receiveIdType"
        title="Receive ID Type"
        value={state.receiveIdType}
        onChange={(value) =>
          setState({ ...state, receiveIdType: value as "email" | "open_id" | "chat_id" })
        }
        info="受信者の識別方法"
      >
        <Form.Dropdown.Item value="email" title="Email (推奨)" />
        <Form.Dropdown.Item value="open_id" title="Open ID (上級者向け)" />
        <Form.Dropdown.Item value="chat_id" title="Chat ID（最も確実）" />
      </Form.Dropdown>

      <Form.TextField
        id="receiveId"
        title="Receive ID"
        placeholder={state.receiveIdType === "email" ? "your-email@example.com" : "ou_xxxxxxxxxx"}
        value={state.receiveId}
        onChange={(value) => setState({ ...state, receiveId: value })}
        info={
          state.receiveIdType === "email" ? "Larkに登録されているメールアドレス" : "LarkのOpen ID"
        }
      />

      <Form.Separator />
      <Form.Description text="⚙️ その他の設定" />

      <Form.Checkbox
        id="prefixTimestamp"
        title="タイムスタンプを付ける"
        label="メッセージの先頭にタイムスタンプを追加"
        value={state.prefixTimestamp}
        onChange={(value) => setState({ ...state, prefixTimestamp: value })}
      />

      <Form.Separator />
      <Form.Description text="💡 ヒント: 設定はLocalStorageに保存されます。Extension Preferencesにも設定したい場合は「Extension Preferencesにコピー」をクリックしてください。" />
    </Form>
  );
}
