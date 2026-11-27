# Video Notes

Take notes while watching a call recording: a hotkey pauses the video, captures the timecode and the frame, and asks for a comment. When you are done, build an HTML table (frame · timecode · comment) and a zip with the frames to share with your team.

## Commands

- **New Video Review** — creates `<Reviews folder>/YYYY-MM-DD Title/` with `notes.md` and `shots/`, opens `notes.md` in your editor and makes the review active.
- **Continue Video Review** — lists existing reviews, most recently edited first. ↵ makes the selected review active.
- **Video Note** — pauses the video, captures the timecode and the frame, and opens a comment field. ⌘↵ appends the note to `notes.md` and resumes the video; Esc saves nothing. A comment starting with `--` is a general note: no timecode or frame, appended to the end of `notes.md`.
- **Build Video Notes HTML** — builds `index.html` and `<review>.zip` next to the review folder. If you provide the recording link, timecodes become links with `?t=<seconds>`.

Assign a hotkey to **Video Note** in Raycast settings.

## Players

- **IINA**: Settings → Advanced → enable advanced settings → Additional mpv options: add `input-ipc-server` = `/tmp/iina-mpv.sock`, then restart IINA.
- **Helium or Google Chrome**: enable View → Developer → Allow JavaScript from Apple Events. The video is taken from the active tab of the front window. The page must serve the video from its own origin, otherwise the browser does not allow reading the frame.

## notes.md format

```markdown
# Title

## 17:28
![](shots/00-17-28.jpg)

Comment in Markdown.

## --

General note without a timecode.
```

You can edit the file freely. The HTML keeps the order of the file: each `## timecode` section becomes a row with its frame, while `## --` and any other `## heading` become full-width rows.
