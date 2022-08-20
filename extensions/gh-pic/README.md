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

### 4. Demo

https://user-images.githubusercontent.com/19505695/185735238-b0260061-c1f9-45e8-a27c-a953b4b96bcb.mov



### 5. Thanks

- Inspired By [aliyun-oss](https://github.com/raycast/extensions/blob/78b7c11594/extensions/aliyun-oss/README.md)

