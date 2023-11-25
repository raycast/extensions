# GHPic 

A simple extension of raycast to upload images to GitHub from clipboard.

## Introduction

GHPic first read the image from the clipboard and upload it to GitHub, then the URL of Image on GitHub is copied to the clipboard.

## Requirements

### 1. Install [pngpasge](https://github.com/jcsalterego/pngpaste)

```
brew install pngpaste
```

### 2. Get a GitHub token

- Visit: [https://github.com/settings/tokens](https://github.com/settings/tokens)

- Click `Generate new token`.

- Fill the Note, choose `repo`, Scroll to the end and click `Generate Token`.
  ![](https://cdn.jsdelivr.net/gh/xiangsanliu/images/img/202208201524393.png)

- Click to copy the token.

  ![](https://cdn.jsdelivr.net/gh/xiangsanliu/images/img/202208201534422.png)

### 3. Configure the extension

  ![](https://cdn.jsdelivr.net/gh/xiangsanliu/images/img/202208201535451.png)

- `GitHub Token`: The token that get from step 2.
- `Repo Name`: The name of the repository.
- `Repo Owner`: The owner of the repository, generally your username of GitHub.
- `Email`: The email of the user.
- `Path`: The path to store the image on GitHub.

## Usage

1. Copy a Picture to the clipboard.
2. Upload to GitHub by this extension.
3. Paste the URL to your article.

> **Note: Due to API restrictions, if you want to upload from a picture file, you need to open the file first and then copy it, instead of copying the file directly in `Finder`.** see [Upload from file](#upload-from-file)

## Demo

### Upload from screenshot

https://user-images.githubusercontent.com/19505695/186912886-ca5c45cf-fec6-4545-a162-86f025a37030.mov

### Upload from file

https://user-images.githubusercontent.com/19505695/187009128-9fdabc42-11e4-4ab0-a646-3e69c6f5c037.mov


## Thanks

- Inspired By [aliyun-oss](https://github.com/raycast/extensions/blob/78b7c11594/extensions/aliyun-oss/README.md)

