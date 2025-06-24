import { Action, ActionPanel, Form, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { execSync } from "child_process";

interface FormValues {
  clientId: string;
  clientSecret: string;
}

const binaryPath =
  "/Users/suenagakatsuyuki/Documents/claude-desktop/fuzzy-drive-search/target/release/fuzzy-drive-search";

export default function InitForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "初期化中...",
        message: "Google Drive認証を開始します",
      });

      // コマンドライン引数として設定値を渡す
      const escapedClientId = values.clientId.replace(/'/g, "'\"'\"'");
      const escapedClientSecret = values.clientSecret.replace(/'/g, "'\"'\"'");

      execSync(`${binaryPath} init --client-id='${escapedClientId}' --client-secret='${escapedClientSecret}'`, {
        encoding: "utf8",
        timeout: 60_000,
      });

      showToast({
        style: Toast.Style.Success,
        title: "初期化完了",
        message: "Google Drive認証が完了しました",
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "初期化エラー",
        message: error instanceof Error ? error.message : "初期化に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="初期化を実行" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="clientId"
        title="Client ID"
        placeholder="Google OAuth2 Client ID"
        info="Google Cloud ConsoleのOAuth 2.0クライアントIDから取得"
      />

      <Form.PasswordField
        id="clientSecret"
        title="Client Secret"
        placeholder="Google OAuth2 Client Secret"
        info="Google Cloud ConsoleのOAuth 2.0クライアントシークレットから取得"
      />
    </Form>
  );
}
