import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
  LocalStorage,
  openExtensionPreferences,
  List,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getTenantAccessToken, sendTextMessage } from "./lark";
import { Language, getTranslation } from "./locales/translations";
import { writeToExtensionPreferences } from "./utils/preferences-writer";
import { suggestSettingsToPreferences } from "./utils/settings-sync";

type OnboardingStep =
  | "language"
  | "welcome"
  | "lark-setup"
  | "basic-config"
  | "receiver-config"
  | "test-connection"
  | "complete";

interface OnboardingState {
  currentStep: OnboardingStep;
  language: Language;
  hasLarkApp: boolean;
  domain: string;
  appId: string;
  appSecret: string;
  receiveId: string;
  receiveIdType: "email" | "open_id" | "chat_id";
}

export default function OnboardingWizard() {
  const { pop } = useNavigation();
  const [state, setState] = useState<OnboardingState>({
    currentStep: "language",
    language: "ja",
    hasLarkApp: false,
    domain: "https://open.larksuite.com",
    appId: "",
    appSecret: "",
    receiveId: "",
    receiveIdType: "email",
  });

  const t = getTranslation(state.language);

  useEffect(() => {
    // Load saved language preference
    LocalStorage.getItem<string>("preferred-language").then((lang) => {
      if (lang === "en" || lang === "ja") {
        setState((prev) => ({ ...prev, language: lang as Language }));
      }
    });
  }, []);

  const nextStep = () => {
    const stepOrder: OnboardingStep[] = [
      "language",
      "welcome",
      "lark-setup",
      "basic-config",
      "receiver-config",
      "test-connection",
      "complete",
    ];
    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setState({ ...state, currentStep: stepOrder[currentIndex + 1] });
    }
  };

  const prevStep = () => {
    const stepOrder: OnboardingStep[] = [
      "language",
      "welcome",
      "lark-setup",
      "basic-config",
      "receiver-config",
      "test-connection",
      "complete",
    ];
    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setState({ ...state, currentStep: stepOrder[currentIndex - 1] });
    }
  };

  const selectLanguage = async (language: Language) => {
    await LocalStorage.setItem("preferred-language", language);
    setState({ ...state, language, currentStep: "welcome" });
  };

  const testConnection = async () => {
    try {
      showToast({ style: Toast.Style.Animated, title: t.testing });

      // 1. Stateの値でテスト実行
      const testPrefs = {
        larkDomain: state.domain,
        appId: state.appId,
        appSecret: state.appSecret,
        receiveIdType: state.receiveIdType,
        receiveId: state.receiveId,
        prefixTimestamp: false,
      };

      // 設定を引数として渡してテスト実行
      const token = await getTenantAccessToken(testPrefs);
      const testMessage =
        state.language === "ja"
          ? "🎉 FlashLarkPost セットアップ完了！\nおめでとうございます。正常に動作しています。"
          : "🎉 FlashLarkPost Setup Complete!\nCongratulations! Everything is working correctly.";
      // タイムスタンプなしで送信
      const decoratedMessage = testMessage;

      await sendTextMessage(token, decoratedMessage, testPrefs);

      // 2. テスト成功 → LocalStorageに保存
      await LocalStorage.setItem("larkDomain", state.domain);
      await LocalStorage.setItem("appId", state.appId);
      await LocalStorage.setItem("appSecret", state.appSecret);
      await LocalStorage.setItem("receiveIdType", state.receiveIdType);
      await LocalStorage.setItem("receiveId", state.receiveId);
      await LocalStorage.setItem("prefixTimestamp", "false");

      // 3. Extension Preferencesに保存を試行
      try {
        await writeToExtensionPreferences({
          larkDomain: state.domain,
          appId: state.appId,
          appSecret: state.appSecret,
          receiveIdType: state.receiveIdType,
          receiveId: state.receiveId,
          prefixTimestamp: false,
        });

        showToast({
          style: Toast.Style.Success,
          title: "✅ 設定保存完了",
          message: "LocalStorageに設定が保存されました",
        });
      } catch (prefError) {
        console.log("⚠️ Extension Preferences保存エラー:", prefError);
        showToast({
          style: Toast.Style.Failure,
          title: "⚠️ 設定保存でエラーが発生",
          message: "基本設定はLocalStorageに保存されました",
        });
      }

      showToast({ style: Toast.Style.Success, title: t.testSuccess, message: t.testSuccessMsg });
      nextStep();
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: t.testFailed,
        message: error.message || t.checkSettings,
      });
    }
  };

  const completeSetup = async () => {
    // 設定は既にtestConnectionで保存済み
    showToast({
      style: Toast.Style.Success,
      title: state.language === "ja" ? "設定完了" : "Setup Complete",
      message: state.language === "ja" ? "すぐに使用できます！" : "Ready to use immediately!",
    });

    // メイン画面に戻る
    setTimeout(() => {
      pop();
    }, 1000);
  };

  if (state.currentStep === "language") {
    return (
      <List navigationTitle={t.selectLanguage} searchBarPlaceholder={t.languagePrompt}>
        <List.Item
          title={t.japanese}
          subtitle="セットアップを日本語で進めます"
          icon="🇯🇵"
          actions={
            <ActionPanel>
              <Action title={`${t.japanese}で続行`} onAction={() => selectLanguage("ja")} />
              <ActionPanel.Section title="設定">
                <Action
                  title="⚙️ Extension Preferencesを開く"
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                  onAction={async () => {
                    await openExtensionPreferences();
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
        <List.Item
          title={t.english}
          subtitle="Continue setup in English"
          icon="🇺🇸"
          actions={
            <ActionPanel>
              <Action title={`Continue in ${t.english}`} onAction={() => selectLanguage("en")} />
              <ActionPanel.Section title="Settings">
                <Action
                  title="⚙️ Extension Preferencesを開く"
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                  onAction={async () => {
                    await openExtensionPreferences();
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (state.currentStep === "welcome") {
    return (
      <Detail
        markdown={`# 🚀 ${t.welcomeTitle}

${t.welcomeDesc}

## ✨ ${t.features}

- **${t.featureAttachment}**: ${t.featureAttachmentDesc}
- **${t.featureTimestamp}**: ${t.featureTimestampDesc}
- **${t.featureGlobal}**: ${t.featureGlobalDesc}
- **${t.featureSecure}**: ${t.featureSecureDesc}

## 🎯 ${t.setupFlow}

1. **${t.setupStep1}**: ${t.setupStep1Desc}
2. **${t.setupStep2}**: ${t.setupStep2Desc}
3. **${t.setupStep3}**: ${t.setupStep3Desc}
4. **${t.setupStep4}**: ${t.setupStep4Desc}

${t.estimatedTime}

${t.readyQuestion}`}
        actions={
          <ActionPanel>
            <Action title={t.startSetup} onAction={nextStep} />
            <Action title={t.setupLater} onAction={pop} />
            <ActionPanel.Section title="設定">
              <Action
                title="⚙️ Extension Preferencesを開く"
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={async () => {
                  await openExtensionPreferences();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  if (state.currentStep === "lark-setup") {
    return (
      <Detail
        markdown={`# 📱 ${t.larkSetupTitle}

${t.larkSetupIntro}

## 🔗 ${t.devConsole}

**${t.globalVersion}:**
- [https://open.larksuite.com/app](https://open.larksuite.com/app)

**${t.chinaVersion}:**
- [https://open.feishu.cn/app](https://open.feishu.cn/app)

## 📋 ${t.createAppSteps}

### 1. ${t.step1CreateApp}
${t.step1Details.map((d) => `- ${d}`).join("\n")}

### 2. ${t.step2EnableBot}
${t.step2Details.map((d) => `- ${d}`).join("\n")}

### 3. ${t.step3Permissions}
${t.step3Details.map((d) => `- ${d}`).join("\n")}

### 4. ${t.step4Release}
${t.step4Details.map((d) => `- ${d}`).join("\n")}

### 5. ${t.step5GetCredentials}
${t.step5Details.map((d) => `- ${d}`).join("\n")}

${t.allDoneQuestion}`}
        actions={
          <ActionPanel>
            <Action title={t.completed} onAction={nextStep} />
            <Action title={t.back} onAction={prevStep} />
            <ActionPanel.Section title="設定">
              <Action
                title="⚙️ Extension Preferencesを開く"
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={async () => {
                  await openExtensionPreferences();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  if (state.currentStep === "basic-config") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={t.next}
              onSubmit={(values: any) => {
                console.log("📝 Basic Config Form Values:", values);
                console.log("📝 Current State Before Update:", state);

                const newState = {
                  ...state,
                  domain: values.domain,
                  appId: values.appId,
                  appSecret: values.appSecret,
                };

                console.log("📝 New State After Update:", newState);
                setState(newState);
                nextStep();
              }}
            />
            <Action title={t.back} onAction={prevStep} />
            <ActionPanel.Section title="設定">
              <Action
                title="⚙️ Extension Preferencesを開く"
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={async () => {
                  await openExtensionPreferences();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      >
        <Form.Description text={t.basicConfigDesc} />

        <Form.Dropdown
          id="domain"
          title={t.larkDomain}
          value={state.domain}
          onChange={(newValue) => setState({ ...state, domain: newValue })}
          info={t.selectEnv}
        >
          <Form.Dropdown.Item
            value="https://open.larksuite.com"
            title="Global (open.larksuite.com)"
          />
          <Form.Dropdown.Item value="https://open.feishu.cn" title="China (open.feishu.cn)" />
        </Form.Dropdown>

        <Form.PasswordField
          id="appId"
          title={t.appId}
          placeholder={t.appIdPlaceholder}
          value={state.appId}
          onChange={(newValue) => setState({ ...state, appId: newValue })}
          info={t.appIdInfo}
        />

        <Form.PasswordField
          id="appSecret"
          title={t.appSecret}
          placeholder={t.appSecretPlaceholder}
          value={state.appSecret}
          onChange={(newValue) => setState({ ...state, appSecret: newValue })}
          info={t.appSecretInfo}
        />
      </Form>
    );
  }

  if (state.currentStep === "receiver-config") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={t.next}
              onSubmit={(values: any) => {
                console.log("📧 Receiver Config Form Values:", values);
                console.log("📧 Current State Before Update:", state);

                const newState = {
                  ...state,
                  receiveIdType: values.receiveIdType,
                  receiveId: values.receiveId,
                };

                console.log("📧 New State After Update:", newState);
                setState(newState);
                nextStep();
              }}
            />
            <Action title={t.back} onAction={prevStep} />
            <ActionPanel.Section title="設定">
              <Action
                title="⚙️ Extension Preferencesを開く"
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={async () => {
                  await openExtensionPreferences();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      >
        <Form.Description text={t.receiverConfigDesc} />

        <Form.Dropdown
          id="receiveIdType"
          title={t.receiveIdType}
          value={state.receiveIdType}
          onChange={(newValue) =>
            setState({ ...state, receiveIdType: newValue as "email" | "open_id" | "chat_id" })
          }
          info={t.receiveIdTypeInfo}
        >
          <Form.Dropdown.Item value="email" title={t.emailRecommended} />
          <Form.Dropdown.Item value="open_id" title={t.openIdAdvanced} />
          <Form.Dropdown.Item value="chat_id" title="Chat ID（最も確実）" />
        </Form.Dropdown>

        <Form.TextField
          id="receiveId"
          title={t.receiveId}
          placeholder={t.receiveIdPlaceholder}
          value={state.receiveId}
          onChange={(newValue) => setState({ ...state, receiveId: newValue })}
          info={state.receiveIdType === "email" ? t.receiveIdEmailInfo : t.receiveIdOpenInfo}
        />

        <Form.Separator />

        <Form.Description text={"💡 " + t.receiverHint} />
      </Form>
    );
  }

  if (state.currentStep === "test-connection") {
    return (
      <Detail
        markdown={`# 🧪 ${t.testConnectionTitle}

${t.testConnectionIntro}

## 📝 ${t.configReview}

- **${t.domain}**: ${state.domain}
- **${t.appId}**: ${state.appId ? state.appId.substring(0, 8) + "..." : "未設定"}
- **${t.receiveId}**: ${state.receiveId || "未設定"}
- **${t.receiveIdType}**: ${state.receiveIdType}

## 🔄 ${t.testSteps}

1. ${t.testStep1}
2. ${t.testStep2}
3. ${t.testStep3}

${t.readyToTest}

---

**🧪 デバッグ情報:**
- App ID: ${state.appId ? "設定済み" : "空欠"}
- App Secret: ${state.appSecret ? "設定済み" : "空欠"}
- Receive ID: ${state.receiveId ? "設定済み" : "空欠"}`}
        actions={
          <ActionPanel>
            <Action
              title={t.startTest}
              onAction={() => {
                console.log("🧪 接続テスト開始 - 現在のstate:", {
                  domain: state.domain,
                  appId: state.appId ? state.appId.substring(0, 8) + "..." : "empty",
                  appSecret: state.appSecret ? "set" : "empty",
                  receiveId: state.receiveId || "empty",
                  receiveIdType: state.receiveIdType,
                });
                testConnection();
              }}
            />
            <Action title={t.fixSettings} onAction={prevStep} />
            <Action
              title="📊 Stateを表示"
              onAction={() => {
                console.log("📊 現在のOnboarding State:", state);
                showToast({
                  style: Toast.Style.Success,
                  title: `State: ${state.appId ? "App IDあり" : "App IDなし"}`,
                  message: `Secret: ${state.appSecret ? "あり" : "なし"}, Email: ${state.receiveId || "なし"}`,
                });
              }}
            />
            <ActionPanel.Section title="設定">
              <Action
                title="⚙️ Extension Preferencesを開く"
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={async () => {
                  await openExtensionPreferences();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  if (state.currentStep === "complete") {
    return (
      <Detail
        markdown={`# 🎉 ${t.completeTitle}

${t.completeDesc}

## ✅ ${t.completedItems}

- ✅ ${t.larkConnected}
- ✅ ${t.messageTestSuccess}
- ✅ ${t.allSettingsOk}
- ✅ LocalStorageに設定保存済み
- ✅ Extension Preferencesへの保存試行済み

## 🚀 ${t.usage}

1. ${t.usageStep1}
2. ${t.usageStep2}
3. ${t.usageStep3}
4. ${t.usageStep4}

## 📋 Extension Preferencesへの保存（推奨）

**より安全な保存**のため、Extension Preferencesにも設定を保存することを推奨します。

**メリット:**
- 🔒 より安全な保存
- 🔄 アップデート時も設定が残る
- 📊 設定の一元管理

下のボタンで設定をコピーし、Preferencesでペーストしてください。`}
        actions={
          <ActionPanel>
            <Action title={t.complete} onAction={completeSetup} />
            <Action
              title="📋 Extension Preferences用設定をコピー"
              onAction={async () => {
                const settingsText = await suggestSettingsToPreferences();
                await Clipboard.copy(settingsText);
                showToast({
                  style: Toast.Style.Success,
                  title: "📋 設定値をクリップボードにコピー",
                  message: "Extension Preferencesで手動設定してください",
                });

                // 3秒後にExtension Preferencesを開く
                setTimeout(async () => {
                  await openExtensionPreferences();
                }, 3000);
              }}
            />
            <ActionPanel.Section title="設定">
              <Action
                title="⚙️ Extension Preferencesを開く"
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={async () => {
                  await openExtensionPreferences();
                }}
              />
            </ActionPanel.Section>
            <Action
              title="🔑 App IDをコピー"
              onAction={async () => {
                await Clipboard.copy(state.appId);
                showToast({
                  style: Toast.Style.Success,
                  title: "📋 App IDをコピー",
                  message: "Extension PreferencesのApp IDフィールドにペースト",
                });
              }}
            />
            <Action
              title="🔒 App Secretをコピー"
              onAction={async () => {
                await Clipboard.copy(state.appSecret);
                showToast({
                  style: Toast.Style.Success,
                  title: "📋 App Secretをコピー",
                  message: "Extension PreferencesのApp Secretフィールドにペースト",
                });
              }}
            />
            <Action
              title="📧 Receive IDをコピー"
              onAction={async () => {
                await Clipboard.copy(state.receiveId);
                showToast({
                  style: Toast.Style.Success,
                  title: "📋 Receive IDをコピー",
                  message: "Extension PreferencesのReceive IDフィールドにペースト",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return null;
}
