# プレースホルダ機能の使用例

Prompt Manager では、プロンプト本文に特殊なプレースホルダを埋め込むことで、コピー・ペースト時に動的にテキストを展開できます。

## サポートされているプレースホルダ

### 1. `{clipboard}`
現在のクリップボードのテキストに置き換えられます。

**使用例:**
```
Please review the following code:

{clipboard}

Focus on:
- Code quality
- Performance
- Security
```

**動作:**
1. レビューしたいコードをコピー
2. このプロンプトで "Paste Filled Prompt" を実行
3. `{clipboard}` がコピーしたコードに置き換わる

---

### 2. `{cursor}`
カーソル位置のマーカーです。ペースト時に削除されます。

**使用例:**
```
Hi there,

I wanted to share this with you:

{clipboard}

{cursor}

Best regards
```

**動作:**
- `{cursor}` の位置にテキストは挿入されず、空になる
- ペースト後、その位置から入力を続けられる

---

## 実用的なサンプルプロンプト

### 1. コードレビュー依頼

**Title:** Code Review Request

**Body:**
```
Please review the following code:

```
{clipboard}
```

Focus points:
- Code quality and readability
- Performance optimization
- Security vulnerabilities
- Best practices

Additional context:
{cursor}
```

**使い方:**
1. レビューしてほしいコードをコピー
2. プロンプトを選択して `⌘ + P` でペースト
3. "Additional context:" の後にコンテキストを追加

---

### 2. 翻訳依頼

**Title:** Translation Request

**Body:**
```
Please translate the following text from English to Japanese:

---
Original Text:
{clipboard}
---

Translation:
{cursor}
```

**使い方:**
1. 翻訳したい英文をコピー
2. プロンプトをペースト
3. "Translation:" の位置で翻訳を入力開始

---

### 3. メール下書き

**Title:** Share Link Email

**Body:**
```
Hi there,

I wanted to share this interesting article with you:

{clipboard}

I thought you might find it useful for our current project. Let me know what you think!

{cursor}

Best regards
```

**使い方:**
1. 記事の URL をコピー
2. プロンプトをペースト
3. 追加のコメントがあれば "Let me know..." の前に追加

---

### 4. バグレポート

**Title:** Bug Report Template

**Body:**
```
## Bug Report

### Description
{cursor}

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[Describe what should happen]

### Actual Behavior
[Describe what actually happens]

### Error Message/Stack Trace
```
{clipboard}
```

### Environment
- OS: 
- Browser/App: 
- Version: 
```

**使い方:**
1. エラーメッセージやスタックトレースをコピー
2. プロンプトをペースト
3. Description から入力開始

---

### 5. ミーティング議事録

**Title:** Meeting Notes

**Body:**
```
# Meeting Notes - [Date]

## Attendees
{cursor}

## Agenda

## Discussion Points

## Action Items
{clipboard}

## Next Steps
```

**使い方:**
1. Slack やチャットからアクションアイテムをコピー
2. プロンプトをペースト
3. Attendees から埋めていく

---

### 6. API ドキュメント

**Title:** API Documentation

**Body:**
```
## API Endpoint Documentation

### Endpoint
`{cursor}`

### Request Example
```json
{clipboard}
```

### Response Format
```json

```

### Parameters

### Error Codes

### Notes
```

**使い方:**
1. リクエストのサンプル JSON をコピー
2. プロンプトをペースト
3. エンドポイント URL を入力して続きを記述

---

### 7. プルリクエスト

**Title:** Pull Request Description

**Body:**
```
## What does this PR do?
{cursor}

## Changes
{clipboard}

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

## Related Issues
Closes #
```

**使い方:**
1. `git diff` の出力や変更ファイル一覧をコピー
2. プロンプトをペースト
3. 概要から記入

---

### 8. 問い合わせメール

**Title:** Customer Support Response

**Body:**
```
Dear Customer,

Thank you for contacting us.

Regarding your inquiry:
{clipboard}

{cursor}

If you have any further questions, please don't hesitate to reach out.

Best regards,
[Your Name]
Customer Support Team
```

**使い方:**
1. 顧客の問い合わせ内容をコピー
2. プロンプトをペースト
3. 回答を記入

---

## 使い分けのヒント

### プレースホルダあり vs なし

プロンプトにプレースホルダが含まれている場合:
- **Enter**: "Copy Filled Prompt to Clipboard" (プレースホルダ展開済み)
- **⌘ + P**: "Paste Filled Prompt to Active App" (プレースホルダ展開済み)
- **⌘ + Shift + C**: "Copy Raw Prompt" (プレースホルダそのまま)

プレースホルダがない場合:
- **Enter**: "Copy to Clipboard"
- **⌘ + P**: "Paste to Active App"

### クリップボードが空の場合

`{clipboard}` が含まれていても、クリップボードが空の場合:
- エラーにはならず、空文字列に置き換わる
- 結果を確認して必要に応じて手動で追加できる

---

## プレースホルダの組み合わせ

複数のプレースホルダを組み合わせることも可能:

```
Review this code:
{clipboard}

Suggestions:
{cursor}

Original discussion:
{clipboard}
```

**注意:**
- `{clipboard}` は複数回使用すると、すべて同じテキストに置き換わります
- クリップボードの内容は固定なので、異なるテキストを入れたい場合は手動で編集が必要です

---

## トラブルシューティング

### プレースホルダが展開されない
→ "Copy Filled Prompt" または "Paste Filled Prompt" を使用していますか？通常の Copy/Paste ではプレースホルダは展開されません。

### クリップボードが空文字列に置き換わる
→ コピー操作が正しく完了しているか確認してください。画像などテキスト以外の内容がクリップボードにある場合も空文字列になります。

### {cursor} の位置にテキストが残る
→ これは想定通りの動作です。{cursor} はマーカーとして削除され、その位置が空になります。

