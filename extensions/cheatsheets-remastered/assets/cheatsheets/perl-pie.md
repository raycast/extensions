---
title: Perl-pie
category: Development
tech: perl-pie
status: active
lastReviewed: '2025-09-05'
---

### About
{: .-intro}

Use `perl` to search and replace across many files.

### Search and replace

```sh
perl -p -i -e 's/hello/hola/g' *.txt
```

### Back-referencing

Use `\1` et al.

```sh
# '@include align-items(center);' => 'align-items: center;'
perl -p -i -e "s/\@include (align-items)\((.*)\);/\1: \2;/g"
```
