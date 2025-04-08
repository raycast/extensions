# Gemini Tech Translate

Translate and Summarize text using the Google Gemini API directly within Raycast, optimized for technical and software development contexts.

## Features

* **Translate to English:** Translates selected text or text from your clipboard into English.
* **Translate to Japanese:** Translates selected text or text from your clipboard into Japanese.
* **Summarize in Japanese:** Summarizes selected text or text from your clipboard in Japanese.

## Setup

This extension requires a Google AI Gemini API Key to function.

1.  **Obtain an API Key:** Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey) or the Google Cloud Console.
2.  **Enter the Key:** Open Raycast Preferences, navigate to the "Extensions" tab, and select "Gemini Translate". Paste your API key into the "Gemini API Key" field.
3.  **(Optional) Configure Model:** The extension defaults to the `gemini-2.0-flash` model. You can change this in the preferences if needed (e.g., `gemini-1.5-pro`, `gemini-1.5-flash`). Refer to the [Google AI Gemini models documentation](https://ai.google.dev/models/gemini) for other available models.

## How to Use

1.  Select the text you want to process OR copy it to your clipboard.
2.  Activate Raycast and search for one of the extension's commands (e.g., "Translate to English", "Summarize in Japanese") or use the configured keyboard shortcuts:
  * `Cmd + Shift + E`: Translate to English
  * `Cmd + Shift + J`: Translate to Japanese
  * `Cmd + Shift + S`: Summarize in Japanese
3.  The result will be displayed in the Raycast window.

---


# Gemini Tech Translate

Google Gemini APIを使用して、Raycast内で直接テキストの翻訳と要約を行う拡張機能です。特にソフトウェア開発の文脈に最適化されています。

## 機能

* **英語に翻訳 (Translate to English):** 選択したテキストまたはクリップボードのテキストを英語に翻訳します。
* **日本語に翻訳 (Translate to Japanese):** 選択したテキストまたはクリップボードのテキストを日本語に翻訳します。
* **日本語で要約 (Summarize in Japanese):** 選択したテキストまたはクリップボードのテキストを日本語で要約します。

## セットアップ

この拡張機能を使用するには、Google AI Gemini APIキーが必要です。

1.  **APIキーの取得:** [Google AI Studio](https://aistudio.google.com/app/apikey) または Google Cloud Console からAPIキーを取得します。
2.  **キーの入力:** Raycastの環境設定を開き、「Extensions」タブから「Gemini Translate」を選択します。「Gemini API Key」の欄に取得したAPIキーを貼り付けてください。
3.  **(任意) モデルの設定:** デフォルトでは `gemini-2.0-flash` モデルを使用します。必要に応じて、環境設定で他のモデル名（例: `gemini-1.5-pro`, `gemini-1.5-flash`）に変更できます。利用可能なモデルについては、[Google AI Gemini モデルのドキュメント](https://ai.google.dev/models/gemini) を参照してください。

## 使い方

1.  処理したいテキストを選択するか、クリップボードにコピーします。
2.  Raycastを起動し、拡張機能のコマンド名（例: "Translate to English", "Summarize in Japanese"）を検索して実行するか、設定したショートカットキーを使用します:
  * `Cmd + Shift + E`: 英語に翻訳
  * `Cmd + Shift + J`: 日本語に翻訳
  * `Cmd + Shift + S`: 日本語で要約
3.  結果がRaycastのウィンドウに表示されます。

---
