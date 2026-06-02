# 同梱音源の配置

このフォルダに以下の名前で音源を置くと、PomoNotion Raycast Extension が自動で検出して使います。

## 推奨ファイル名

- `rain-ambient.mp3`
  - 作業中の雨音
  - 自然音ベース、遠くでまれに雷が鳴る雰囲気を想定
- `break-piano.mp3`
  - 休憩中のピアノ音楽
  - 穏やかでループ再生に向くものを想定
- `alarm-bell.mp3`
  - セッション終了時の短いベル音

## 現在配置されている音源

- `rain-ambient.mp3`
  - 出典: [Pixabay - Nature copyright free rain sounds](https://pixabay.com/sound-effects/nature-copyright-free-rain-sounds-331497/)
- `break-piano.mp3`
  - 出典: [Pixabay - Musical the last piano](https://pixabay.com/sound-effects/musical-the-last-piano-112677/)
- `alarm-bell.mp3`
  - 出典: [Pixabay - Film special effects bell fx](https://pixabay.com/sound-effects/film-special-effects-bell-fx-410608/)

## 優先順位

1. Raycast Preferences で指定したユーザー音源
2. このフォルダの同梱音源
3. アラームのみ macOS 標準音

## 注意

- 現在の再生は `afplay` ベースです
- 長時間ループ向けに、極端に大きなファイルは避けてください
- mp3 以外を使いたい場合は、Preferences 側で明示指定してください
