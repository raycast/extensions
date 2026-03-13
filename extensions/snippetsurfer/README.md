# SnippetSurfer

SnippetSurfer is a Raycast extension designed to swiftly navigate through snippets of information. You can effortlessly skim through text excerpts, code snippets, or any other brief segments of content and copy them to the clipboard. The snippets are read from a folder of Markdown or YAML files.

Note: This extension does not work with built-in [Raycast snippets](https://manual.raycast.com/snippets). It uses its own snippets that you have to set up and maintain.

### Getting Started

After installing this extension, go to its settings and select a *Primary Snippet Folder*. This can be any folder on your machine. You can also choose a *Secondary Snippet Folder* to load snippets from another place.

After selecting the folder, you can create your snippets by creating one or more Markdown or YAML files, each containing a collection of snippets.

Please note: SnippetSurfer does not support creating snippets directly in Raycast. Use your preferred editor to create snippets instead.
### Features

- Raycast extension for quick navigation of text excerpts and code snippets.
- Supports filtering by folders or subfolders and by tags.
- Supports both yaml and markdown formats for easy organization.
    - For markdown files, YAML Metadata support enables addition of titles and descriptions to snippets for better organization.
- Streamlines personal workflows by automatically copying code snippets to the clipboard.
- Automatically copies only the content inside code snippets for code snippets.

### Example of Markdown File

```md
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

### Example of YAML File

```yaml
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
