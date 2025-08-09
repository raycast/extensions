# 📁 Create Note Folder – A Raycast Extension for Structured Note Management

A simple yet efficient Raycast extension that streamlines your note creation workflow in Typora (or any markdown editor).  
Inspired by Obsidian's [folder-notes](https://github.com/LostPaul/obsidian-folder-notes), this tool automates the repetitive and error-prone steps of note initialization — without relying on plugins.

---

## ✨ Features

- 🗂️ **Configurable Root Folder**  
  Define a root directory where all your notes will be stored. Keeps your workspace tidy and consistent.
<br>

- 📄 **Note Folder + Markdown File in One Click**  
  Creates a new folder (named after your note) and initializes a markdown file inside — either with the same name or a default `index.md`.
<br>

- 🧩 **Template Support** *(optional)*  
  Choose from your own markdown templates when creating a new note. Helps you standardize structure and save time.
<br>

- 🧹 **Easy Cleanup**  
  Since each note and its resources are stored in a dedicated folder, deleting a note is as simple as deleting the folder — no leftover assets to track down.

---

## 📁 Folder Structure

Your notes will follow this structure:

```bash
notes-root/
├── My New Note/
│   ├── My New Note.md      # or index.md
│   └── image.png
├── Another Note/
│   ├── Another Note.md
│   └── diagram.svg
```

You can optionally configure:

- The file name to match the folder name (`My New Note.md`)  
- Or to use a fixed name like `index.md` (perfect for Hugo-style content organization)

---

## 🚀 How to Use

1. Open Raycast (⌘ + Space, then type command)
2. Run `Create Note`
3. Enter the name of your note
4. Select a template (optional)
5. A new folder and markdown file will be created in your configured note root directory.

---

## ⚙️ Preferences

You can configure the following in the extension's settings:

- **Notes Root Directory**: Where all your notes are stored  
- **File Naming Strategy**: `index.md` or match folder name  
- **Template Directory** *(optional)*: Where your markdown templates live  
- **Default Template** *(optional)*: Automatically use this unless another is selected

---

## 🛠️ Example Use Cases

- 🧠 Personal knowledge base
- 📚 Academic notes
- 📝 Hugo blog content management
- 💡 Quick idea capture with structure

---

## 📎 Why Not Just Use Typora?

Typora is an excellent markdown editor but lacks plugin support. This Raycast extension fills that gap by handling the file/folder boilerplate for you — letting you focus on writing.

---

## 📎 Why Template location is fixed and cannot be changed?

Having a fixed template directory ensures that all your note templates are always in a predictable place, making it easier for the extension to manage, find, and use your templates reliably. This also avoids confusion and potential errors caused by moving or renaming the template folder.

---

## 📌 Future Ideas

- Auto-open the created markdown file in Typora (or editor of choice)  
- Template variables (e.g., date, title, tags)  
- Create subfolders (e.g., `assets/`) automatically  
- Quick Actions for deleting or archiving a note folder

---

## 💬 Feedback & Contributions

This tool was built to solve a real-world workflow issue. If you have ideas, feature requests, or want to contribute — feel free to open an issue or pull request!

More detail see https://developers.raycast.com