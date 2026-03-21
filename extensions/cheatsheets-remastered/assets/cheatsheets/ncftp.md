---
title: ncftp
category: CLI
tech: ncftp
status: active
lastReviewed: '2025-09-05'
---

### Bookmarking

```bash
$ ncftp
$ open -u username ftp.host.com
$ bookmark bookmarkname
```

### Mass download

```bash
$ ncftpget -R bookmarkname /www/ .
```

### Mass upload

```bash
$ ncftpput -R bookmarkname /www/ .
```

### Upload just the changed files

```bash
$ git show --pretty="format:" --name-only HEAD~1
$ ncftpget -R -C log bookmarkname /www/ .
```
