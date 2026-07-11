# YouVersion Bible Suggest for Raycast

_Copyright 2022-2025 Caleb Evans_  
_Released under the MIT license_

This [Raycast][raycast] extension allows you to search the YouVersion Bible
quickly and easily. You can:

- Look up a specific verse or chapter by name
- Search for Bible verses matching a specific phrase
- Copy any verse contents to the clipboard.
- Choose an alternate language (other than English) and/or pick your preferred
  version/translation (e.g. ESV, NKJV)

## Disclaimer

This project is not affiliated with YouVersion, and all Bible content is
copyright of the respective publishers.

This tool also retrieves Bible content directly from YouVersion for personal
use. However, please be aware that this functionality does not fully comply with
YouVersion's Terms of Use.

## [Download Extension][extension-in-store]

[raycast]: https://www.raycast.com/
[extension-in-store]: https://www.raycast.com/caleb531/youversion-suggest

## Commands

### Filter Bible Reference

Allows you to quickly jump to a particular Bible chapter, verse, or range of
verses just by typing the name of that Bible reference.

### Search the Bible by Phrase

Allows you to find Bible verses related to a particular phrase or topic

### Set Bible Preferences

Allows you to set your preferred language, version/translation, and more.
Available preferences include:

#### Language

The language to use for Bible reference names and content (e.g. "Salmos 1"
instead of "Psalms 1"). Please note that this preference does not impact the
names of the extension's commands or other informational text.

#### Version

The Bible version/translation to use for Bible content (e.g. "ESV" instead of
"NIV"). The list of available versions is dependent on what language you have
currently selected.

#### Reference Format

A text string that controls the format of Bible content that you copy to the
clipboard. It can contain blank lines and most other special characters, as
well as any of the following "magic" variables:

- `{content}`: The textual content of the Bible reference, minus the citation
  (e.g. "Jesus wept.")
- `{name}`: The title of the copied Bible reference, minus the version information
  (e.g. "John 11:35")
- `{version}`: The version/translation of the copied Bible reference (e.g.
  "ESV" or "NIV")

Some examples include:

```
{name} ({version})

{content}
```

```
{content}
– {name} ({version})
```

#### Include Verse Numbers in Content?

If checked, adds the verse number labels to Bible content that you copy to the
clipboard. This preference is off by default.

#### Preserve Line Breaks in Content?

If checked, preserves the line breaks that are part of some Bible content. For
example, if you want to copy a verse from the Psalms to your clipboard all on
one line, then turn this preference off. This preference is on by default.
