# Ciweimao-Raycast

a Raycast extension which let you read books from ciweimao via their mobile apis.

## Features

- Search books by name or author and favor it
- List all of your bookshelves
- Read book
- Buy VIP chapters
- Delete books
- TTS(WIP)

## How to get the login token and account

- make the curl request like this (replace `{password}` and `{account}` by yourself)

```shell
 curl "https://app.hbooker.com/signup/login?app_version=2.8.021&device_token=ciweimao_f&passwd={password}&login_name={account}" \
 -H 'User-Agent: Android com.kuangxiangciweimao.novel'
```

- you will get an encrypted response, copy and visit `https://decryptcwm-online.pages.dev/#/` to decrypt it to json, the value of `login_token` and `account` are what you need.

## Showcases

### All Commands

![all-commands](https://user-images.githubusercontent.com/25399519/144173165-c457895b-36b3-47e1-8a5a-ae6b125ce4af.jpg)

### List Books

![list-books](https://user-images.githubusercontent.com/25399519/144173184-c886ddeb-6ddc-4446-8f1d-39bd87faa765.jpg)

### List Shelves

![list-shelves](https://user-images.githubusercontent.com/25399519/144173187-d33d71c4-5959-485e-b599-21f93b61367d.jpg)

### Search Books

![search-books](https://user-images.githubusercontent.com/25399519/144173191-b2db1f39-fee4-4c9e-bd7d-3f7af5c51be4.jpg)

### Catalog

![catalog](https://user-images.githubusercontent.com/25399519/144173179-7a4c173d-3733-4f90-af89-422b0604eacb.jpg)

### Reading

![reading](https://user-images.githubusercontent.com/25399519/144173188-b6acbb68-e9a1-4259-b716-3ff28b969c8c.jpg)
