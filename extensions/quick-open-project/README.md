# Quick Open Project

This extension provides fast access to your projects on disk, with fuzzy search and [frecency](https://slack.engineering/a-faster-smarter-quick-switcher-77cbc193cb60) to remember your most used paths.

At a minimum, this extension requires a comma-separated list of paths to search for project directories, e.g.

    ~/code,~/work

A given path is expanded as if it had a trailing `/*` at the end, i.e. `~/code` finds all project directories in `~/code/*`. You can also add your own wildcards using the npm [`glob`](https://www.npmjs.com/package/glob) syntax; to index a `~/go/src` tree, you could use `~/go/src/*/*` to find both `github.com/spf13/cobra` and `golang.org/x/sync`.
