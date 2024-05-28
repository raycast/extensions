# SnippetSurfer

SnippetSurfer is a raycast extension designed to swiftly navigate through snippets of information. You can effortlessly skim through text excerpts, code snippets, or any other brief segments of content and copy them to the clipboard. The snippets are read from a folder of markdown files.

### Features
- Raycast extension for quick navigation of text excerpts and code snippets.
- Supports filtering by folders or subfolders and by tags.
- Supports both yaml and markdown formats for easy organization.
    - For markdown files, YAML Metadata support enables addition of titles and descriptions to snippets for better organization.
- Streamlines personal workflows by automatically copying code snippets to the clipboard.
- Automatically copies only the content inside code snippets for code snippets.

### Example of markdown
```
---
Title: Git init
Description: |
    Create empty Git repo in specified directory.
    Run with noarguments to initialize the current directory as a git repository.
Tags:
  - git
---
```shell
git init
    ```
```

### Example of yaml file
```
snippets:
  - title: Git Init
    description: "Create empty Git repo in specified directory"
    code: "git init"
    language: "shell"
    tags:
      - git
  - title: Git commit
    description: "Record changes to the repository"
    content: "Some content"
  - title: Git pull
    description: "Fetch from and integrate with another repository or a local branch"
    content: |
      Incorporates changes from a remote repository
      into the current branch. If the current branch is
      behind the remote, then by default it will
      fast-forward the current branch to match the remote.
```
