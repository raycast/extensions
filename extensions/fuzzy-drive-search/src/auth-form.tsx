import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useInitialization } from "./hooks/useInitialization";

export default function AuthForm() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const { initialize } = useInitialization();

  const handleSubmit = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "Client IDとClient Secretを入力してください",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "認証設定中...",
        message: "Google Drive APIの認証を設定しています",
      });

      await initialize();

      await showToast({
        style: Toast.Style.Success,
        title: "認証完了",
        message: "Google Drive APIの認証が完了しました",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "認証エラー",
        message: error instanceof Error ? error.message : "認証に失敗しました",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="認証を実行" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Google Drive APIの認証情報を入力してください。Google Cloud Consoleで取得したOAuth 2.0クライアントIDとシークレットを使用します。" />

      <Form.TextField
        id="clientId"
        title="Client ID"
        placeholder="例: 123456789-abcdefg.apps.googleusercontent.com"
        value={clientId}
        onChange={setClientId}
        info="Google Cloud ConsoleのOAuth 2.0クライアントIDです"
      />

      <Form.TextField
        id="clientSecret"
        title="Client Secret"
        placeholder="例: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
        value={clientSecret}
        onChange={setClientSecret}
        info="Google Cloud ConsoleのOAuth 2.0クライアントシークレットです"
      />

      <Form.Separator />

      <Form.Description
        text="設定手順:
1. Google Cloud Consoleでプロジェクトを作成
2. Google Drive APIを有効化
3. OAuth 2.0クライアントIDを作成
4. 上記の情報を入力して認証を実行"
      />
    </Form>
  );
}
