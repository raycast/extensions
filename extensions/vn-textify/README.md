# 🇻🇳 Vietnamese Telex Transformer

Stop fighting your keyboard. Type freely, transform instantly.

## The Pain

If you type in both Vietnamese and English, you know the struggle:

- **Constant switching.** Toggle between Vietnamese and English input modes dozens of times a day. One missed switch and you've typed `yé, ưe ảe gôd` instead of `yes, we are good` in your English chat.
- **Mental overhead.** Every sentence, you pause: *"Am I in telex mode right now?"* That split-second context switch breaks your flow.
- **IME side effects.** Traditional IMEs process every keystroke. Accidentally type `s` at the end of `status` and your Vietnamese keyboard turns it into `státu`. Type `proof` and watch it become `proò`. You can't just type normally when thinking in English.
- **Mixed-language documents.** Writing technical docs, chat messages, or code comments that mix Vietnamese and English? The back-and-forth is exhausting.

## The Solution

**Vietnamese Telex Transformer** lets you forget about input modes entirely. Stay in your default English keyboard. Type raw telex characters naturally (`toios nay capaj nhataj status ticket dos cho toio nhes`). When you're ready, hit one hotkey and the extension transforms it into proper Vietnamese (`tối nay cập nhật status ticket dó cho tôi nhé`).

No IME. No switching. No side effects. Just type and transform.

## ✨ Features

- **Free-flow typing.** Type telex in any app, any language mode — the extension doesn't intercept your keystrokes. English words like `status`, `proof`, `fix` pass through untouched even after transformation.
- **Post-typing transformation.** Select your raw text, press a hotkey, and it's instant.
- **Smart tone placement.** Follows Chữ Quốc Ngữ rules — tones land on the correct vowel in every cluster (`hoà` not `hỏa`, `tiếng` not `tíêng`, `mượn` not `muợn`).
- **Zero dependencies, fully local.** No network, no tracking, no background processes.

## 🚀 Installation

1. Clone this repository.
2. Run `npm install`.
3. In Raycast, run `Import Extension` and select this folder.
4. Assign a hotkey (e.g. `Cmd + Option + V`) in Raycast Settings.

## 🛠 Usage

1. Select any raw telex text: `tooi ddang hocj code`.
2. Press your assigned hotkey.
3. The selected text is replaced with: `tôi đang học code`.

Mix English freely — words that don't look Vietnamese are left alone.
