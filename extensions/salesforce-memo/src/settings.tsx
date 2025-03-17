/* eslint-disable */
import React, { useState, useEffect } from "react";
import {
  ActionPanel,
  Form,
  Action,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  useNavigation,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";
import { SalesforceService } from "./utils/salesforce";
import fs from "fs";

interface Preferences {
  salesforceUrl: string;
  memoDirectory: string;
}

interface FormValues {
  username: string;
  password: string;
  securityToken: string;
}

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [securityToken, setSecurityToken] = useState("");
  const [hasValidSetup, setHasValidSetup] = useState(true);
  const [setupMessage, setSetupMessage] = useState("");
  const { push } = useNavigation();

  const salesforceService = new SalesforceService();
  const preferences = getPreferenceValues<Preferences>();

  // 初期設定の検証
  useEffect(() => {
    verifySetup();
  }, []);

  // 必要な初期設定を検証
  const verifySetup = () => {
    let isValid = true;
    let message = "";

    // メモディレクトリが設定されているか確認
    if (!preferences.memoDirectory) {
      isValid = false;
      message += "• メモディレクトリが設定されていません。\n";
    } else {
      // ディレクトリが存在するか確認
      try {
        const stats = fs.statSync(preferences.memoDirectory);
        if (!stats.isDirectory()) {
          isValid = false;
          message += "• 設定されたメモディレクトリが有効なディレクトリではありません。\n";
        }
      } catch (error) {
        isValid = false;
        message += "• 設定されたメモディレクトリにアクセスできません。\n";
      }
    }

    setHasValidSetup(isValid);
    setSetupMessage(message);
  };

  // 拡張機能設定を開く
  const openSettings = () => {
    openExtensionPreferences();
  };

  // 保存されている認証情報があれば読み込む
  useEffect(() => {
    const loadCredentials = async () => {
      const credentials = await salesforceService.getCredentials();
      if (credentials) {
        setUsername(credentials.username);
        // パスワードとセキュリティトークンは表示しない（セキュリティ上の理由）
      }
    };

    loadCredentials();
  }, []);

  const handleSubmit = async (values: FormValues) => {
    if (!hasValidSetup) {
      await showToast({
        style: Toast.Style.Failure,
        title: "設定エラー",
        message: "Raycast設定で必要な項目を設定してください",
      });
      return;
    }

    if (!values.username || !values.password) {
      await showToast({
        style: Toast.Style.Failure,
        title: "入力エラー",
        message: "ユーザー名とパスワードを入力してください",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 認証情報を保存
      await salesforceService.saveCredentials({
        username: values.username,
        password: values.password,
        securityToken: values.securityToken || "",
      });

      // 接続テスト
      const connected = await salesforceService.connect();
      if (connected) {
        await showToast({
          style: Toast.Style.Success,
          title: "接続成功",
          message: "Salesforceに接続できました",
        });

        // 設定情報表示画面に遷移
        push(
          <SettingsDetail
            username={values.username}
            salesforceUrl={preferences.salesforceUrl}
            memoDirectory={preferences.memoDirectory}
          />,
        );
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "接続エラー",
          message: "Salesforceへの接続に失敗しました",
        });
      }
    } catch (error) {
      console.error("設定保存エラー:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "設定の保存中にエラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 設定が有効でない場合は警告を表示
  if (!hasValidSetup) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Raycast設定を開く" onAction={openSettings} icon={Icon.Gear} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="⚠️ 初期設定が必要です"
          text={`以下の問題を解決するために、Raycast設定を開いてください：\n\n${setupMessage}\n「Raycast設定を開く」ボタンをクリックして、必要な設定を行ってください。`}
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="設定を保存" onSubmit={handleSubmit} icon={Icon.SaveDocument} />
          <Action title="Raycast設定を開く" onAction={openSettings} icon={Icon.Gear} />
        </ActionPanel>
      }
    >
      <Form.Description title="Salesforce接続設定" text="Salesforceに接続するための認証情報を入力してください。" />
      <Form.TextField
        id="username"
        title="ユーザー名"
        placeholder="user@example.com"
        value={username}
        onChange={setUsername}
        autoFocus
      />
      <Form.PasswordField
        id="password"
        title="パスワード"
        placeholder="パスワードを入力"
        value={password}
        onChange={setPassword}
      />
      <Form.TextField
        id="securityToken"
        title="セキュリティトークン"
        placeholder="セキュリティトークンを入力（必要な場合）"
        value={securityToken}
        onChange={setSecurityToken}
        info="Salesforceの設定によっては不要な場合があります"
      />
      <Form.Description
        title="Raycast設定"
        text={`メモの保存先: ${preferences.memoDirectory || "未設定"}\nSalesforce URL: ${preferences.salesforceUrl || "未設定（デフォルトを使用）"}`}
      />
      <Form.Description
        title="ヘルプ"
        text="「メモの保存先」が設定されていない場合は、右上の「Raycast設定を開く」をクリックして設定してください。"
      />
    </Form>
  );
}

function SettingsDetail({
  username,
  salesforceUrl,
  memoDirectory,
}: {
  username: string;
  salesforceUrl: string;
  memoDirectory: string;
}) {
  const markdownContent = `# Salesforce連携設定

## 認証情報
- **ユーザー名**: ${username}
- **認証状態**: 接続済み

## Raycast設定
- **メモ保存先**: ${memoDirectory || "未設定"}
- **Salesforce URL**: ${salesforceUrl || "デフォルト"}

## 注意事項
- パスワードとセキュリティトークンはローカルに保存されています
- 認証情報を変更する場合は、設定画面から再度入力してください

## 使い方ガイド
1. メモの作成は「Create Memo」コマンドを使用します
2. 既存のメモを表示・編集するには「View Memos」コマンドを使用します
3. Salesforceとの同期は各メモの詳細画面から行えます
`;

  return <Detail markdown={markdownContent} />;
}
