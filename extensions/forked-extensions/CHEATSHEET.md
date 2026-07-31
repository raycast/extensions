# Cheatsheet

## Git Commands

### Clone a repository with `tree:0` filter

```shell
git clone --filter=tree:0 --no-checkout --no-tags <fork-repository-url>
```

### Convert full checkout to sparse checkout with cone mode

```shell
git sparse-checkout set --cone
git checkout main
```

### Set upstream repository

```shell
git remote add upstream <upstream-repository-url>
git config remote.origin.promisor true
git config remote.origin.partialclonefilter tree:0
git config remote.origin.tagOpt --no-tags
git config remote.upstream.promisor true
git config remote.upstream.partialclonefilter tree:0
git config remote.upstream.tagOpt --no-tags
git config --replace-all remote.upstream.fetch +refs/heads/main:refs/remotes/upstream/main
```

### Sync the forked repository with the upstream on local

```shell
git fetch --prune --no-tags --filter=tree:0 upstream +refs/heads/main:refs/remotes/upstream/main
git checkout main
git merge --ff-only upstream/main
```

### Pull the latest changes from your fork on local

```shell
git fetch --prune --no-tags --filter=tree:0 origin +refs/heads/main:refs/remotes/origin/main
git checkout main
git merge --ff-only origin/main
```

### Add a sparse-checkout directory

```shell
git sparse-checkout add extensions/<your-extension>
```

### List sparse-checkout directories

```shell
git sparse-checkout list
```

### Remove a sparse-checkout directory

1. Open the `.git/info/sparse-checkout` file in your favorite text editor.
2. Remove the line that corresponds to the directory you want to untrack.
3. Save the file and run the following command to update the working directory

```shell
git sparse-checkout reapply
```

### Disable sparse-checkout

```shell
git sparse-checkout disable
```

## References

- [`git-clone` documentation](https://git-scm.com/docs/git-clone)
- [`git-fetch` documentation](https://git-scm.com/docs/git-fetch)
- [`git-sparse-checkout` documentation](https://git-scm.com/docs/git-sparse-checkout)
