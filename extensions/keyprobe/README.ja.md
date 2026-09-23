<p align="center">
  <a href="README.md">English</a> | 日本語
</p>

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="KeyProbe icon" />
</p>

<h1 align="center">KeyProbe</h1>

<p align="center">
  Raycast から呼び出せるキーボード導通確認用のテスターツールです。
  <br />
  押したキーをネイティブの半透明パネルで可視化し、自作キーボードが OS レベルで正しく動作しているか確認できます。
</p>

![押下中・テスト済みのキーが表示されたKeyProbeパネル](metadata/keyprobe-1.png)

## 機能

- キーを押している間はハイライトし、離すと「テスト済み」色に変わり、まだ押していないキーが一目で分かります
- ANSI / JIS / ISO の標準レイアウトを内蔵しており、接続されているキーボードのハードウェア種別に応じてこの3種類の中から自動的に切り替わります。
- Corne、Lily58、Planck、HHKB、Keychron Q11、moNa2、Kinesis Advantage 360 など、現在50種類以上のカスタムキーボードレイアウトを同梱しており、**Select Keyboard Layout** から検索して選択できます。
- OS固有のキーコードを持たないキー（レイヤーキー、メディアキーなど）は「テスト不可」として表示しています。レイヤー切り替え後のキーを押下して正しく入力されることを確認してください。
- Reset ボタンでパネルを閉じずに全キーの状態をクリアできます

## セットアップ

1. Raycast から **Open KeyProbe** を実行します
2. 権限を求められたら **入力監視 (Input Monitoring)** を許可し、もう一度コマンドを実行します

> [!IMPORTANT]
> 初回起動には **入力監視 (Input Monitoring)** 権限が必要です（アクセシビリティではありません）。システム設定 → プライバシーとセキュリティ → 入力監視 で `KeyProbeHelper` を有効にしてから、もう一度 **Open KeyProbe** を実行してください。これを許可しないと、パネルは開きますがキーを押しても何も反応しません。

## レイアウトの選択

<p align="center">
  <img src="metadata/keyprobe-2.png" width="49%" alt="Select Keyboard Layout の検索UI" />
  <img src="metadata/keyprobe-3.png" width="49%" alt="カスタム分割キーボードのレイアウト表示例" />
</p>

- Raycast の Preferences にある **Keyboard Layout** で、デフォルトのレイアウト（Auto-detect / ANSI / JIS / ISO）を設定できます
- **Select Keyboard Layout** コマンドでは、同梱の全レイアウト（カスタムキーボード含む）を検索して選択できます。パネルを開いたままでも即座に切り替わります

> [!NOTE]
> Auto-detect は接続されている**キーボードのハードウェア種別**を見て判定しており、macOSの入力ソース（言語設定）とは無関係です。ANSI形状のキーボードは、ファームウェアがJISマップのキーコンボを送信してきても「ANSI」のまま扱われます。そうしたキーを検証したいときは明示的にJISを選んでください。

## 既知の制約

> [!WARNING]
> 輝度・音量などのハードウェアメディアキーは、このツールが捕捉できない別種のイベントとして送られてくるため、まったく反応しません（「レイアウト外キー」としても表示されません）。
- cornixなどのzmkファームウェアなどの小キーレイアウトはデフォルトキーマップがマクロ多用で自動解析できなかったため、実際のデフォルトキーマップの画像を参考にレイアウトを作成しています。表示されているキー以外の入力確認は上部に表示されたテキストのキー入力または、100%(ANSI)など、その他のKeyboard Layout上でご確認ください。

## 自作キーボードのレイアウトを追加する

同梱されているボードは、`tools/` 以下のスクリプトでQMK/ZMKファームウェアのソースから変換しています:

```bash
# QMKボード（keyboard.json/info.json + keymap.c または keymap.json）
python3 tools/qmk_to_layout.py \
  --keyboard-json <qmk_firmware>/keyboards/<board>/keyboard.json \
  --keymap <qmk_firmware>/keyboards/<board>/keymaps/default/keymap.json \
  --name "My Board" --out assets/layouts/myboard.json

# ZMKボード（物理レイアウトJSON + .keymap DTSファイル）
python3 tools/zmk_to_layout.py \
  --geometry <zmk-config>/config/myboard.json --layout-name default_layout \
  --keymap <zmk-config>/config/myboard.keymap \
  --name "My Board" --out assets/layouts/myboard.json
```

生成されたJSONを `assets/layouts/` に置くことで、コード変更なしに検索UIから選べるようになります。各スクリプトは `--help` で全オプションを確認できます。
