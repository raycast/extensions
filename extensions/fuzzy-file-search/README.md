# Fuzzy File Search

Raycast command that lets you fuzzy-find files by their full path, not only by filename. It is built for people who keep projects in deeply nested folder structures and want to jump straight to the right file.

![Screenshot of the command list](./metadata/fuzzy-file-search-1.png)

## Why Use It Instead of Raycast's Built-in Search Files?

- Matches folder names and file names together (e.g. `algo home pdf` → `~/algorithms/homework.pdf`).
- Keeps context when several files share the same name in different directories.
- Indexes with [`fd`](https://github.com/sharkdp/fd) and filters with [`fzf`](https://github.com/junegunn/fzf) for lightning-fast results on large trees.
- Offers quick actions (open, show in Finder, copy path, Quick Look) without leaving Raycast.

## How It Works

- On first run the extension downloads portable copies of `fd` and `fzf` to the Raycast support directory.
- Every time you open the command it reindexes the selected search roots with `fd` and caches the list locally for the session.
- Filtering is delegated to `fzf`, which performs path-aware fuzzy matching and returns the best hits immediately.

## Configure the Search

Open the Raycast extension preferences to tailor the results:

- `Include Directories`: show both directories and files (enabled by default).
- `Include Hidden`: surface dot-files and hidden folders.
- `Follow Symbolic Links`: descend into symlinked directories.
- `Ignore Spaces in Search`: strip spaces from the query so `src foo bar` behaves like `srcfoobar`.
- `Custom Search Directories`: space-separated list of extra roots. Use the search bar dropdown inside the command to switch between `Home (~)`, `Everything (/)`, or your custom set.

## Ignore Rules and `.fdignore`

`fd` respects the same ignore rules as the desktop CLI:

- `.gitignore`, `.git/info/exclude`, and `.ignore` files are obeyed automatically.
- `.fdignore` files are also honored. You can place them in any directory to prune matches.
- On first run the extension creates a global `$HOME/.config/fd/ignore` (if missing) with sensible defaults to keep the index snappy.
  Edit that file to fine-tune global ignores.

If you need different rules per project, add a `.fdignore` alongside the folders you index or rely on the project's `.gitignore`. The command will pick up the changes the next time the index is refreshed.

## Tips

- Large trees index fastest when unnecessary paths are ignored—tune your `.fdignore` to skip build output and vendor folders.
- Combine folder hints and filename fragments in the query to jump straight to the exact file you want.
