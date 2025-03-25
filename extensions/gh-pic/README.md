# GHPic 

A simple extension of raycast to upload images to GitHub from clipboard.

## Introduction

GHPic first read the image from the clipboard and upload it to GitHub, then the URL of Image on GitHub is copied to the clipboard.

## Requirements


### 1. Get a GitHub token

- Visit: [https://github.com/settings/tokens](https://github.com/settings/tokens)

- Click `Generate new token`.

- Fill the Note, choose `repo`, Scroll to the end and click `Generate Token`.
  ![](https://cdn.jsdelivr.net/gh/xiangsanliu/images/img/202208201524393.png)

- Click to copy the token.

  ![](https://cdn.jsdelivr.net/gh/xiangsanliu/images/img/202208201534422.png)

### 2. Configure the extension

  ![](https://cdn.jsdelivr.net/gh/xiangsanliu/images/img/202208201535451.png)

- `GitHub Token`: The token that get from step 2.
- `Repo Name`: The name of the repository.
- `Repo Owner`: The owner of the repository, generally your username of GitHub.
- `Email`: The email of the user.
- `Path`: The path to store the image on GitHub.

## Usage

1. Copy a Picture to the clipboard or just copy from the Finder.app.
2. Upload to GitHub by this extension.
3. Paste the URL to your article.

## Demo

### Upload from screenshot

https://user-images.githubusercontent.com/19505695/186912886-ca5c45cf-fec6-4545-a162-86f025a37030.mov

### Upload from file

https://github.com/xiangsanliu/gh-pic/assets/19505695/64840684-a015-41fc-8954-19f88abc0a3d


## Thanks

- Inspired By [aliyun-oss](https://github.com/raycast/extensions/blob/78b7c11594/extensions/aliyun-oss/README.md)

