# Lark Quick Memo - 友人向けセットアップガイド

このガイドでは、Lark Quick Memo Raycastエクステンションを友人の環境でセットアップする方法を説明します。

## 📋 必要な環境

- **macOS** (Raycastが必要)
- **Raycast** アプリケーション（[公式サイト](https://www.raycast.com/)からダウンロード）
- **Node.js** 18以上（開発時のみ必要）
- **Lark/Feishuアカウント**

## 🚀 セットアップ手順

### 1. プロジェクトファイルの準備

1. このプロジェクトフォルダ全体を友人のMacにコピーします
2. ターミナルでプロジェクトディレクトリに移動します：
   ```bash
   cd /path/to/lark-quick-memo
   ```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Lark/Feishuアプリの作成

#### 3.1 開発者コンソールにアクセス
- **グローバル版**: [Lark Developer Console](https://open.larksuite.com/app)
- **中国版**: [Feishu Console](https://open.feishu.cn/app)

#### 3.2 カスタムアプリの作成
1. 「**カスタムアプリ**」を選択
2. アプリ名を入力（例：「Quick Memo」）
3. アプリを作成

#### 3.3 権限の設定
1. 「**権限管理**」→「**API権限**」に移動
2. 以下の権限を追加：
   - `im:message` - メッセージ送信権限
   - `im:message:send_as_bot` - ボットとしてメッセージ送信

#### 3.4 認証情報の取得
1. 「**基本情報**」ページで以下をコピー：
   - **App ID**
   - **App Secret**

### 4. Raycastエクステンションの追加

#### 4.1 開発モードでの追加
1. Raycastを開く（`Cmd + Space`）
2. 「**Extensions**」と入力してEnter
3. 「**Develop Extensions**」をクリック
4. 「**Add Extension**」をクリック
5. プロジェクトフォルダ（`lark-quick-memo`）を選択

#### 4.2 設定の構成
1. Raycastで「**Extensions**」→「**Lark Quick Memo**」→「**Configure Extension**」
2. 以下の設定を入力：

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| **Lark Domain** | `https://open.larksuite.com` または `https://open.feishu.cn` | 使用するLarkのドメイン |
| **App ID** | 手順3.4で取得したApp ID | Larkアプリの識別子 |
| **App Secret** | 手順3.4で取得したApp Secret | Larkアプリの秘密鍵 |
| **Receive ID Type** | `email` | 受信者の識別方法 |
| **Receive ID** | あなたのLarkログインメールアドレス | メッセージの送信先 |
| **Prefix Timestamp** | ✅（お好みで） | メッセージにタイムスタンプを追加 |

### 5. 動作テスト

1. `Cmd + Shift + M` を押してエクステンションを起動
2. テストメッセージを入力
3. `Cmd + Enter` で送信
4. LarkのDMにメッセージが届くことを確認

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. 「App ID or App Secret not configured」エラー
- Raycastの設定でApp IDとApp Secretが正しく入力されているか確認
- 設定を保存し直してみる

#### 2. 「Failed to get tenant access token」エラー
- App IDとApp Secretが正しいか確認
- Larkドメインの設定が正しいか確認（グローバル版 vs 中国版）

#### 3. 「Failed to send message」エラー
- Receive IDが正しいか確認（メールアドレスの場合）
- Larkアプリの権限設定を再確認

#### 4. メッセージが届かない
- Receive ID Typeと実際のReceive IDが一致しているか確認
- Larkアプリがアクティブになっているか確認

### デバッグ方法

1. Raycastで `Cmd + Shift + D` を押してデバッグモードを有効化
2. エクステンション実行時のログを確認
3. 必要に応じて開発者コンソールでAPIレスポンスを確認

## 📁 プロジェクト構造

```
lark-quick-memo/
├── package.json          # プロジェクト設定と依存関係
├── tsconfig.json         # TypeScript設定
├── icon.png             # エクステンションアイコン
├── README.md            # プロジェクト説明
├── SETUP_GUIDE.md       # このファイル
└── src/
    ├── quick-memo.tsx   # メインコンポーネント
    ├── lark.ts         # Lark API関連
    ├── onboarding.tsx  # 初期設定ウィザード
    └── utils/          # ユーティリティ関数
```

## 🔒 セキュリティ注意事項

- App SecretはRaycastのキーチェーンに安全に保存されます
- 設定情報を他人と共有しないでください
- 定期的にApp Secretを更新することを推奨します

## 📞 サポート

問題が発生した場合は、以下を確認してください：
1. このガイドの手順を正確に実行したか
2. Larkアプリの権限設定が正しいか
3. ネットワーク接続に問題がないか

それでも解決しない場合は、エラーメッセージとともにお知らせください。