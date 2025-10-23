import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

export default function ChatSetupGuide() {
  const markdown = `
# 📋 チャット追加ガイド

このガイドでは、社内グループチャットと外部グループチャットを送信先リストに追加する方法を説明します。

## 🏢 社内グループチャットの追加

### 方法1: Chat IDを使用する場合

1. **Chat IDを取得**
   - Larkアプリでグループチャットを開く
   - チャット設定 → 詳細情報 → Chat IDをコピー
   - Chat IDは \`oc_xxx\` の形式です

2. **カスタムチャットに追加**
   - Quick Memoで \`⌘ + Shift + A\` を押す
   - 「カスタムチャットを追加」を選択
   - **名前**: グループ名を入力
   - **タイプ**: 「グループチャット」を選択
   - **Chat ID**: コピーしたChat IDを貼り付け
   - 「追加」をクリック

### 方法2: ボットを使用する場合

1. **ボットをグループに追加**
   - Lark管理画面でボットを作成
   - ボットをグループチャットに招待
   - ボットの権限を設定

2. **アプリ設定を更新**
   - Quick Memo設定でApp IDとApp Secretを設定
   - 自動的にボットが参加しているチャットが表示されます

---

## 🌐 外部グループチャットの追加

### Webhook URLを使用する方法

1. **Webhook URLを取得**
   - 外部グループチャットの管理者に連絡
   - Incoming Webhook URLを取得
   - URLは \`https://open.larksuite.com/open-apis/bot/v2/hook/xxx\` の形式です

2. **カスタムチャットに追加**
   - Quick Memoで \`⌘ + Shift + A\` を押す
   - 「カスタムチャットを追加」を選択
   - **名前**: 外部グループ名を入力
   - **タイプ**: 「Webhook」を選択
   - **Webhook URL**: 取得したURLを貼り付け
   - 「追加」をクリック

### 注意事項
- Webhook URLは外部グループの管理者から提供される必要があります
- Webhook経由では一部の機能（ファイル添付など）が制限される場合があります
- セキュリティのため、Webhook URLは適切に管理してください

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

**Q: Chat IDが見つからない**
- A: グループチャットの設定画面で「詳細情報」を確認してください
- A: 管理者権限が必要な場合があります

**Q: ボットが表示されない**
- A: App IDとApp Secretが正しく設定されているか確認
- A: ボットがグループに正しく追加されているか確認

**Q: Webhook送信が失敗する**
- A: Webhook URLが正しいか確認
- A: 外部グループの管理者にWebhookの状態を確認

**Q: 送信権限がない**
- A: ボットに適切な送信権限が付与されているか確認
- A: グループの設定でボットの投稿が許可されているか確認

---

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. **設定の確認**
   - Larkアプリの設定
   - ボットの権限設定
   - グループチャットの設定

2. **ログの確認**
   - Quick Memoのコンソールログ
   - エラーメッセージの詳細

3. **管理者への相談**
   - 社内IT部門
   - Lark管理者
   - 外部グループの管理者

---

*このガイドは Quick Memo v1.0 に基づいています*
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="チャット追加ガイド"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="ガイドをコピー"
            content={markdown}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Lark公式ドキュメント"
            url="https://open.larksuite.com/document/"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
