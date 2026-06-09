# Chinese Script Converter

Convert the currently selected text between **Simplified** and **Traditional**
Chinese, with automatic direction detection and a customizable dictionary for
word-level (Taiwan ⇄ Mainland) vocabulary differences.

## Features

- **One-shortcut conversion** – select any Chinese text, run **Convert**, and it
  is replaced in place with the opposite script.
- **Automatic direction detection** – the extension figures out whether the
  selection is Simplified or Traditional and converts to the other.
- **Custom dictionary** – define your own phrase rules (e.g. `資料庫` ⇄ `数据库`)
  that take precedence over character-by-character conversion. Longer phrases are
  applied first so they are never partially overwritten.
- **Built-in preset** – ships with 80+ common cross-strait vocabulary
  differences (computing, UI, devices, everyday life) so it works out of the box.

## Commands

### Convert

Reads the currently selected text, detects the script, converts it, and pastes
the result back over the selection. A heads-up display confirms the direction
(`簡體 → 繁體` or `繁體 → 簡體`).

### Manage Dictionary

A list view to add, edit, and delete your custom conversion rules. Each rule maps
a Traditional form to a Simplified form and is applied in both directions.

- **Add / Edit / Delete** rules from the action panel.
- **Load Preset Dictionary** (`⌘D`) – merges the built-in preset into your
  current rules, skipping any that already exist.

## How It Works

1. The selected text is analyzed to detect Simplified vs. Traditional.
2. Your dictionary rules are applied first (longest phrases first), so custom
   vocabulary like `軟體`/`软件` is handled correctly.
3. [OpenCC](https://github.com/nk2028/opencc-js) then performs accurate
   character-level conversion for everything else.

## Examples

| Input | Output |
| --- | --- |
| `这个软件用数据库存数据` | `這個軟體用資料庫存數據` |
| `請打開螢幕上的資料夾` | `请打开屏幕上的文件夹` |
| `我用程式設計寫了一個應用程式` | `我用编程写了一个应用程序` |

## Notes

- Currently supported on **Windows**.
- The preset intentionally excludes highly ambiguous terms to avoid incorrect
  conversions. You can always add or remove rules to suit your needs.
