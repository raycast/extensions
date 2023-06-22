# Natural Space

This project is still in very early stage, please [log an issue](https://github.com/EnixCoda/NaturalSpace/issues/new?title=Unexpected+format+result+from+...&template=unexpected_format_result.yml) if you got any unexpected result.

This is a [Raycast](https://raycast.com) extension that adds proper space to natural language text.

Based on [sparanoid/chinese-copywriting-guidelines](https://github.com/sparanoid/chinese-copywriting-guidelines), and more.

For example,

```diff
-今天,我和Mike 出去买菜花了 5000元，还买了两本书，一本是《资治通鉴》，另一本是《Vision，the key to the future》.
+今天，我和 Mike 出去买菜花了 5000 元，还买了两本书，一本是《资治通鉴》，另一本是《Vision, the key to the future》。
```

## Install

### From Raycast Store

Not available yet. Will update the link once it pass review.

### Manually

1. Download the latest release. Git clone or ZIP download the repo, and unzip it.
1. Open terminal, navigate to the repo folder, run `npm i` to install dependencies. You need to have [Node.js](https://nodejs.org) installed.
1. Open Raycast, find `Import Extension`, then select the repo folder.

## Usage

In any application, select the text you want to format, then trigger Raycast and enter `Natural Space` or `Format selected text`.

If the selected text is in editable area, the formatted text will be pasted back to the original position. Otherwise, the formatted text will be copied to clipboard.

Note: this extension is still under development, it is welcome to open an issue if you got any unexpected format result.
