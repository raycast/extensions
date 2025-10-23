# FlashLarkPost - 友人向けインストールガイド / Friend Installation Guide

## 日本語版 / Japanese Version

### 📋 必要な環境

FlashLarkPostを使用するために、以下のソフトウェアが必要です：

1. **Raycast** (macOS用ランチャーアプリ)
   - 公式サイト: https://raycast.com/
   - 無料でダウンロード・インストール可能

2. **Node.js** (バージョン18以上)
   - 公式サイト: https://nodejs.org/
   - LTS版（推奨）をダウンロード

3. **Larkアカウント**
   - Lark（飞书）のアカウントが必要
   - 企業アカウントまたは個人アカウント

### 🚀 インストール手順

#### ステップ1: 前提条件の確認

1. **Raycastのインストール確認**
   ```bash
   # ターミナルで以下を実行
   which raycast
   ```
   パスが表示されればOK

2. **Node.jsのインストール確認**
   ```bash
   node --version
   npm --version
   ```
   両方でバージョンが表示されればOK

#### ステップ2: FlashLarkPostのインストール

1. **ZIPファイルの展開**
   - ダウンロードしたZIPファイルを任意の場所に展開
   - 例: `~/Documents/FlashLarkPost/`

2. **依存関係のインストール**
   ```bash
   cd /path/to/lark-quick-memo
   npm install
   ```

3. **拡張機能のビルド**
   ```bash
   npm run build
   ```

#### ステップ3: Raycastへの拡張機能追加

1. **Raycastを開く**
   - `Cmd + Space` でRaycastを起動

2. **拡張機能の追加**
   - Raycastで `Import Extension` と入力
   - または `Cmd + ,` で設定を開き、「Extensions」タブへ

3. **フォルダの選択**
   - 「Add Extension」をクリック
   - 展開した `lark-quick-memo` フォルダを選択

#### ステップ4: Lark Developer Console設定

1. **Lark Developer Consoleにアクセス**
   - https://open.larksuite.com/ にアクセス
   - Larkアカウントでログイン

2. **新しいアプリの作成**
   - 「Create App」をクリック
   - アプリ名: `FlashLarkPost` (任意)
   - アプリタイプ: `Custom App`

3. **アプリ権限の設定**
   以下の権限を有効にしてください：
   - `im:message`
   - `im:message.group_at_msg`
   - `im:message.p2p_msg`
   - `im:chat`

4. **認証情報の取得**
   - 「Credentials & Basic Info」タブで以下を取得：
     - `App ID`
     - `App Secret`

#### ステップ5: FlashLarkPostの初期設定

1. **Raycastで設定を開く**
   - Raycastで `FlashLarkPost` と入力
   - 初回起動時に設定画面が表示

2. **Lark認証情報の入力**
   - App ID: 取得したApp IDを入力
   - App Secret: 取得したApp Secretを入力

3. **認証の完了**
   - 「Authenticate」ボタンをクリック
   - ブラウザでLarkログインページが開く
   - 認証を完了

### 🎯 基本的な使用方法

1. **クイックメモ**
   - Raycastで `Quick Memo` と入力
   - メモを入力してEnter

2. **メッセージ履歴**
   - Raycastで `Message History` と入力
   - 過去のメッセージを確認

3. **設定管理**
   - Raycastで `Settings Manager` と入力
   - 各種設定を変更

### 🔧 トラブルシューティング

#### よくある問題と解決方法

**問題1: 「Module not found」エラー**
```bash
# 解決方法
cd /path/to/lark-quick-memo
rm -rf node_modules package-lock.json
npm install
```

**問題2: Lark認証が失敗する**
- App IDとApp Secretが正しいか確認
- Lark Developer Consoleで権限設定を再確認
- ネットワーク接続を確認

**問題3: Raycastで拡張機能が表示されない**
- Raycastを再起動
- 拡張機能フォルダのパスを再確認
- `npm run build` を再実行

**問題4: メッセージ送信が失敗する**
- Larkアプリの権限設定を確認
- 送信先のチャットIDが正しいか確認

### 📞 サポート

問題が解決しない場合は、以下の情報と共にお知らせください：
- エラーメッセージの詳細
- 使用しているmacOSのバージョン
- Node.jsのバージョン
- 実行したコマンドと結果

---

## English Version

### 📋 Requirements

To use FlashLarkPost, you need the following software:

1. **Raycast** (macOS launcher app)
   - Official website: https://raycast.com/
   - Free download and installation

2. **Node.js** (version 18 or higher)
   - Official website: https://nodejs.org/
   - Download LTS version (recommended)

3. **Lark Account**
   - Lark (飞书) account required
   - Corporate or personal account

### 🚀 Installation Steps

#### Step 1: Check Prerequisites

1. **Verify Raycast Installation**
   ```bash
   # Run in terminal
   which raycast
   ```
   If a path is displayed, it's OK

2. **Verify Node.js Installation**
   ```bash
   node --version
   npm --version
   ```
   If both show versions, it's OK

#### Step 2: Install FlashLarkPost

1. **Extract ZIP File**
   - Extract the downloaded ZIP file to any location
   - Example: `~/Documents/FlashLarkPost/`

2. **Install Dependencies**
   ```bash
   cd /path/to/lark-quick-memo
   npm install
   ```

3. **Build Extension**
   ```bash
   npm run build
   ```

#### Step 3: Add Extension to Raycast

1. **Open Raycast**
   - Launch Raycast with `Cmd + Space`

2. **Add Extension**
   - Type `Import Extension` in Raycast
   - Or press `Cmd + ,` to open settings, go to "Extensions" tab

3. **Select Folder**
   - Click "Add Extension"
   - Select the extracted `lark-quick-memo` folder

#### Step 4: Lark Developer Console Setup

1. **Access Lark Developer Console**
   - Go to https://open.larksuite.com/
   - Login with your Lark account

2. **Create New App**
   - Click "Create App"
   - App Name: `FlashLarkPost` (or any name)
   - App Type: `Custom App`

3. **Configure App Permissions**
   Enable the following permissions:
   - `im:message`
   - `im:message.group_at_msg`
   - `im:message.p2p_msg`
   - `im:chat`

4. **Get Credentials**
   - In "Credentials & Basic Info" tab, get:
     - `App ID`
     - `App Secret`

#### Step 5: Initial Setup of FlashLarkPost

1. **Open Settings in Raycast**
   - Type `FlashLarkPost` in Raycast
   - Settings screen will appear on first launch

2. **Enter Lark Credentials**
   - App ID: Enter the obtained App ID
   - App Secret: Enter the obtained App Secret

3. **Complete Authentication**
   - Click "Authenticate" button
   - Browser will open Lark login page
   - Complete authentication

### 🎯 Basic Usage

1. **Quick Memo**
   - Type `Quick Memo` in Raycast
   - Enter memo and press Enter

2. **Message History**
   - Type `Message History` in Raycast
   - View past messages

3. **Settings Management**
   - Type `Settings Manager` in Raycast
   - Change various settings

### 🔧 Troubleshooting

#### Common Issues and Solutions

**Issue 1: "Module not found" error**
```bash
# Solution
cd /path/to/lark-quick-memo
rm -rf node_modules package-lock.json
npm install
```

**Issue 2: Lark authentication fails**
- Verify App ID and App Secret are correct
- Re-check permission settings in Lark Developer Console
- Check network connection

**Issue 3: Extension not showing in Raycast**
- Restart Raycast
- Re-check extension folder path
- Re-run `npm run build`

**Issue 4: Message sending fails**
- Check Lark app permission settings
- Verify destination chat ID is correct

### 📞 Support

If issues persist, please provide the following information:
- Detailed error messages
- macOS version you're using
- Node.js version
- Commands executed and their results

---

## 🎉 Enjoy FlashLarkPost!

Thank you for using FlashLarkPost! We hope this tool enhances your Lark messaging experience through Raycast.

FlashLarkPostをお使いいただき、ありがとうございます！このツールがRaycastを通じてLarkメッセージング体験を向上させることを願っています。