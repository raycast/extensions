# SnippetSurfer

SnippetSurfer is a raycast extension designed to swiftly navigate through snippets of information. You can effortlessly skim through text excerpts, code snippets, or any other brief segments of content and copy them to the clipboard. The snippets are read from a folder of markdown files.

### Features
- Raycast extension for quick navigation of text excerpts and code snippets.
- Reads snippets from Markdown files for easy organization.
- YAML Metadata support enables addition of titles and descriptions to snippets for better organization.
- Streamlines workflow integration by automatically copying code snippets to the clipboard.
- Automatically copies only the content inside code snippets for code snippets. 

### Example of markdown
```
	---
	Title: Git Init
	Description: Create empty Git repo in specified directory. Run with noarguments to initialize the current directory as a git repository
	---
	```shell
	git init
	```
```
