# Diff Anything for Raycast

Open two files, two folders, or two texts side by side in the Diff Anything app on your Mac.

## Requirements

macOS, Raycast, and Diff Anything 1.6.1 or later from the Mac App Store. If the app is missing or older, the extension says so and offers to open the Mac App Store.

## Commands

**Compare Files or Folders.** When exactly two files or two folders are selected in Finder, the command fills in both paths. You can also type or paste absolute paths, or use **Use Two Selected Finder Items**. Check the left and right order, swap them if needed, and choose **Open in Diff Anything**. The comparison opens in a new Diff Anything tab.

**Compare Text.** Type or paste two texts, or load the clipboard into either side with a Load Clipboard action. Empty text is a valid side. Choose **Open in Diff Anything** to see them side by side.

Comparisons use the features and limits of your Diff Anything plan. Purchase or restore Pro in the app.

## Privacy

The extension makes no network requests, sends nothing to an AI model, and does not read clipboard history. It reads the clipboard only when you choose a Load Clipboard action, and it reads the Finder selection when Compare Files or Folders opens. It hands your files to Diff Anything through macOS and never changes them.

Compare Text saves both texts as private files (folder mode 0700, file mode 0600) in the extension's support folder so Diff Anything can open them and read them again. A later text comparison removes pairs older than a day. Deletion is not secure erasure.

## Development

Run `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` in this directory. With Raycast installed, `npm run dev` imports the commands.
