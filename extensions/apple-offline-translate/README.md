# Apple Translate

Translate selected, pasted, or typed text on your Mac using Apple's on-device Translation framework. Read the original and translation side by side, keep paragraph breaks and lists, and copy or paste the result back into your work. No Raycast Pro subscription, API key, or external translation service is required.

## Mac compatibility

| Mac and operating system | Supported by this extension |
| --- | --- |
| Apple Silicon Mac — M1 or later — running **macOS 26.4 or later** | Yes, when the required Apple language models are available and installed |
| Apple Silicon Mac running macOS 26.3 or earlier | No — this extension uses Translation APIs introduced in macOS 26.4 |
| Intel Mac, including Intel Macs with a recent macOS release | No — this extension requires Apple Silicon |
| Windows or Linux | No |

This includes compatible Apple Silicon MacBook Air, MacBook Pro, iMac, Mac mini, Mac Studio, and Mac Pro models. Both the processor and macOS version must meet the requirements. You can check them in **Apple menu → About This Mac**.

Tested on an **M4 Max Mac running macOS 27.2**. Other supported Mac models and every language pair have not been individually tested.

## First-time setup

The extension only uses models already installed on your Mac. It does not download models during a translation.

- With **Apple Intelligence enabled and its models ready**, the extension prefers Apple's `highFidelity` translation strategy.
- When that strategy is unavailable, Apple's framework may use traditional on-device translation models. Install the required languages in **System Settings → General → Language & Region → Translation Languages**.
- The Mac needs internet access for initial system model downloads. After the required models are installed, translations run on the device without a cloud translation API.

Available languages and translation quality depend on Apple's models and the device's configuration. The extension does not invoke the Siri app or Siri's conversational interface. It is an independent extension, not an Apple product.

## One command, one hotkey

Run **Translate**, or assign it a hotkey in **Raycast Settings → Extensions → Apple Translate**.

- If text is selected in the previous application, it is used as the source.
- If no text is selected, the translator opens empty without an error.
- Press **⌘V** to load the clipboard, or **⌘E** to enter or edit multiline text.
- The default **Russian ↔ English** mode chooses the direction automatically. Use **Translation Direction…** in the Action Panel to choose another target language.

The two continuous columns grow only when the text needs more space. The whole view scrolls vertically, with corresponding source and translated lines kept together. A larger native window is available as an optional action; normal reading and copying work inside Raycast.

| Shortcut | Action |
| --- | --- |
| ⌘V / ⌥⌘V | Replace the source with clipboard text, preserving its line breaks and available RTF formatting |
| ⌘E | Edit the multiline source |
| ⌘↵ | Copy the complete translation |
| ⌥⌘↵ | Paste the translation into the previous app |
| ⌘F | Open a selectable full-text translation view inside Raycast |
| ⇧⌘F | Open the optional larger translation window |
| ⌘L | Choose the translation direction |
| ⌘S | Swap the source and translation |
| ⌘R | Retry translation |
| ⌘⌫ | Clear the source |

## Formatting and limits

Line endings, blank lines, indentation, and common list markers are preserved. If the clipboard contains matching RTF and plain-text representations, the extension passes attributed text to Apple and includes rich formatting in the copied HTML/RTF result. Bold styling and link destinations have been tested.

The selected-text API and the source editor provide plain text. Formatting that is absent from the input cannot be recovered. The side-by-side view displays text; use the full-text action for selectable text or the optional larger window to inspect rich formatting.

The limit is **20,000 UTF-16 code units per translation**; some emoji count as more than one unit. Lines are translated separately to preserve layout, which can reduce context across line boundaries. Images, document page layout, and complex tables are not preserved. Short or mixed-language inputs may require a longer passage or a different target-language setting.

## Privacy

There is no external translation API, analytics, or translation history in this extension. Source text and results are passed to the native helper built by Raycast through standard input and output, not shell arguments or temporary text files. Only the selected language and mode are remembered locally. Copying uses the system clipboard and its normal history settings.

Apple's Translation framework controls model selection. This extension uses the installed-model session initializer and refuses a session that can request downloads.

## Apple documentation

- [Installed-model translation sessions](https://developer.apple.com/documentation/translation/translationsession/init(installedsource:target:))
- [Apple Intelligence translation strategy](https://developer.apple.com/documentation/translation/translationsession/strategy/highfidelity)
