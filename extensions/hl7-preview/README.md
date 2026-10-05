# HL7 Preview

Preview HL7 v2 messages in Raycast, with named segments, fields and components.

## Use

1. Run **Preview HL7**. It always opens on the paste screen.
2. Press `⌘V` to paste a copied `.hl7` file, a file path, or a raw message.

The paste screen lists the other ways in:

- `⌘⇧H` past views, searchable by patient name
- `⌘⇧L` choose a file
- `⌘O` open the file selected in Finder, when there is one

Past views are off by default, because they hold patient data. Turn on **Keep Past Views** in
the extension preferences to keep the last 50 views, with a copy of each message in Raycast's
local encrypted storage, so a view reopens as it was seen. **Open Current File** (`⌘↵`) reads the file as it is now.
**Clear History** (`⌃⇧X`) removes all stored views.

The message shows as one document that you scroll with the mouse or the arrow keys:

1. The header: sender, receiver, time and version.
2. The patient.
3. Each order with its material, its results, flags, reference ranges and notes.
4. Every segment, with each field's HL7 v2.5 name, its components and the meaning of common
   coded values.

## Shortcuts

- `⌘V` paste a file or message
- `⌘⇧L` choose a file
- `⌘⇧H` past views, searchable by patient name
- `⌘⇧G` show or hide the segments
- `⌘⇧E` show or hide empty fields
- `⌘⇧R` show the raw message
- `⌘⇧F` copy one field
- `⌘⇧C` copy the message, `⌘⇧J` copy it as JSON

## Develop

    npm install
    npm run dev    # loads the extension into Raycast
    npm test
