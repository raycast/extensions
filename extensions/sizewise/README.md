# Sizewise for Raycast

See what's taking up space on your Mac without leaving Raycast. [Sizewise](https://getsizewise.app)
is a Mac app that shows a folder or disk as a treemap, where each file is a rectangle sized by the
space it takes.

**Get Folder Size**, **Largest Files**, and **Disk Space** work on their own, and so do Raycast AI
answers about sizes. To see a folder as a map, choose **Scan**: it opens the folder in the Sizewise
app, which runs on macOS 15 or later. Download it from
[getsizewise.app](https://getsizewise.app).

## Commands

- **Scan Folder** lists your disks with how much space each has available, and the Home,
  Applications, and Downloads folders that Sizewise offers when it opens. Type to find one, or enter a
  folder's path, such as `~/Projects`, to scan any folder. Press Return to scan it in Sizewise.
  The action panel also has **Show Largest Files**, which lists the largest files on that disk or
  in that folder, **Show in Finder**, and **Copy Path**.
- **Scan Finder Selection** scans the folder selected in Finder. With nothing selected, it scans
  the folder of the front Finder window, or the desktop when no Finder window is open.
- **Get Folder Size** shows how much space the folder selected in Finder takes up, without opening
  Sizewise. With nothing selected, it measures the front Finder window's folder.
- **Largest Files** lists the largest files in your home folder, 100 MB or larger by default,
  using Spotlight's index, so the list appears without a scan. Show a file in Finder, preview it
  with Quick Look, scan its folder in Sizewise, or move it to the Trash after confirming. Files
  Spotlight doesn't index, such as most of `~/Library`, aren't listed. To see those, scan the
  folder in Sizewise. To search another folder or a disk, choose it in the command's settings.
- **Disk Space** puts your startup disk's available space in the menu bar, refreshed every 10
  minutes. Its menu lists every disk with its available space; choose one to scan it in Sizewise.
  Run it once to add it to the menu bar.

To scan a folder straight from the root search, set **Scan Folder** as a fallback command in
Raycast's settings. Then type a path such as `~/Library/Caches` in Raycast, and choose **Scan
Folder** to open it with that path filled in.

## Raycast AI

Mention `@sizewise` in AI Chat or Quick AI to ask how much space your disks have available, how
big a folder is, which files are largest, or what's taking up space in a folder, as in
`@sizewise how big is my Downloads folder?`. To answer how big a folder is, the extension measures
it with the `du` tool built into macOS. It finds the largest files with Spotlight, as **Largest
Files** does, and never moves them to the Trash itself. To show what's taking up space, it opens
the folder in Sizewise.

To avoid macOS permission prompts, measuring skips other apps' data. Folders Raycast can't read
aren't counted, and the answer then says the folder takes up at least that much. For the full
picture, open the folder in Sizewise, which can read more with Full Disk Access.

It can also answer from the scans you save in Sizewise with **File > Save Scan…**, as in
`@sizewise what grew since my last scan?`: what's in a folder, its largest files at any depth, the
space each kind of file takes up, and what changed between two scans. For these, it asks the same
reader Sizewise gives Claude and other AI assistants, so turn on **Let AI assistants read scan
results** in Sizewise's Settings first. The reader only reads saved scans: it can't change or
delete anything.

## Permissions

The first time you run **Scan Finder Selection** or **Get Folder Size**, macOS asks whether
Raycast can control Finder, which it needs to read the selection. Sizewise asks for any access it
needs to read your folders itself.
