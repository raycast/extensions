# File Share Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Open a share list over the local network: files, folders and text in one list that both sides can add to and remove from
- Keep the service running after the command closes, and stop it automatically when Raycast quits
- Show the state, the labelled link and the QR code in one compact panel, and add files by reference (files are not copied)
- Browse and search the list in any browser, with live updates when someone else changes it
- Download single files (with byte-range support for video seeking), selected entries, or whole folders as a streamed zip — Zip64 keeps files past 4 GB working
- Upload several files at once — with the button or by dropping them on the list — with progress behind one icon, cancelling that works mid-transfer, a retry for anything that failed (dropping the same file again continues it instead of listing it twice), automatic renaming on conflicts, and chunked uploads that resume after an interruption
- Clear the whole list in one action, with a confirmation: the files on disk are never touched
- Use the same page on a phone: the list drops to a touch-sized layout without sideways scrolling
- Preview images, rendered markdown, text, video and audio in the browser; PDFs open in the browser's own viewer, and folders can be browsed level by level
- Follow the system light/dark setting, with a switch for light, dark or system
- Report a download that cannot start as a toast inside the page instead of opening a JSON error page
- Report port conflicts with the program holding the port, and offer a one-step restart when the port or interface changes
- Keep everything inside the local network: no CDN, no telemetry, no external requests
