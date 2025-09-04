# Cheatsheet

## Git Commands

### Clone a repository with sparse-checkout

```shell
git clone --filter=blob:none --no-checkout <fork-repository-url>
git sparse-checkout set --cone
git checkout main
```

### Set upstream repository

```shell
git remote add upstream <upstream-repository-url>
```

### Sync the forked repostiory with the upstream on lcoal

```shell
git fetch upstream
git checkout main
git merge --ff-only upstream/main
```

### Add a sparce-checkout directory

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
3. Save the file and run the following command to update the working directory:
   ```shell
   git sparse-checkout reapply
   ```
