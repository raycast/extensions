# Microsoft Word

Control the document currently open in Microsoft Word for Mac.

## What's new

- New **Recent Word Documents** command (Spotlight-powered) with Quick Look, open in Word and reveal in Finder.
- Active Document now shows word, character and paragraph counts, reading time and a text preview.

## Commands

- **Active Document** shows the document’s location, save status, read-only state, and Track Changes state. Copy the main document text, copy the current selection, or explicitly turn Track Changes on or off.
- **New Document from Text** creates an unsaved document from typed or clipboard text. Save it in Word when ready.
- **Toggle Track Changes** changes the active document’s tracking state and reads it back.

## Requirements

Microsoft Word for Mac must be installed. For document inspection or tracking, open a document first. If prompted by macOS, allow Raycast to automate Word in **System Settings → Privacy & Security → Automation**. No Microsoft account token is collected by the extension; Word’s own license and document access apply.

## Behavior

The inspector reads document metadata. Text copying reads the main document story only. Formatted text is copied as plain text. Actions from the document view verify the active document identity before operating. Refresh after changing documents or saving under a new name. Turning tracking off does not accept or discard existing revisions.

A new document remains unsaved. Existing documents are preserved. The extension uses Microsoft’s shipped Word scripting dictionary, with no menu clicking or VBA macro installation.

## Development

Run `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`. The default tests use simulated native responses and do not open Word.

`npm run test:live -- --exclusive-slot` is the separate live integration test. Run it only after a fresh exclusive test slot is assigned and Word is already open. It creates a disposable unsaved document, verifies text/selection/metadata/tracking and saved-state preservation, closes the exact unchanged fixture, and checks the previous active document and count. It refuses to launch Word automatically. If creation is interrupted or its identity cannot be verified, inspect Word before retrying; do not guess which document to close.

## Sources and scope

- [Raycast AppleScript utility](https://developers.raycast.com/utilities/functions/runapplescript)
- [Raycast extension structure](https://developers.raycast.com/information/file-structure)
- Microsoft’s installed `Word.sdef` scripting dictionary is the command reference for this local integration.
- [Existing Microsoft Office extension](https://www.raycast.com/tonka3000/microsoft-office) offers recent-file search on Windows. These macOS document controls cover different behavior.
- [Existing Office2PDF source](https://github.com/raycast/extensions/tree/main/extensions/office2pdf) converts files through CloudConvert. This extension does not duplicate that upload workflow.

