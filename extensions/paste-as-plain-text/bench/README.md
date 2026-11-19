# Latency bench

`bench/e2e.js` times a paste end to end: from launching the command until the pasted text is
visible in TextEdit. It launches the command through its deeplink, which adds a constant ~55 ms
that a hotkey does not pay.

```sh
npm run build
osascript -l JavaScript bench/e2e.js 8          # Plain Text
osascript -l JavaScript bench/e2e.js 8 JSON     # any format from the command's dropdown
```

It opens a TextEdit document, pastes into it, and closes it without saving. Do not touch the
keyboard while it runs; it stops if another app becomes frontmost.

## Results (macOS, warm command, 8 runs)

| build                                        | bundle | launch to visible |
| -------------------------------------------- | ------ | ----------------- |
| before                                       | 1.9 MB | 314 to 356 ms     |
| after                                        | 38 KB  | 192 to 201 ms     |
| minimal extension that only reads and pastes | 1.7 KB | 189 to 209 ms     |

The last row is the floor for any Raycast extension: the remaining time is Raycast starting the
command and macOS delivering the paste.
