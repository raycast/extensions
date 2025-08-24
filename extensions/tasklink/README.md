# TaskLink

Simple extension to convert issue tracker Ids into clickable links using HTML or Markdown.

https://github.com/raycast/extensions/assets/1197514/5d06e598-6afc-41c4-9c56-bf9213eb861f

It (currently) supports Jira-style Ids (e.g., `RAY-123`) and GitHub-style Ids (e.g., `#12345`). Is your issue tracker using a different pattern? Open a new issue or just hack a new PR :)

## How does it work?

1. Select the text that contains the issue ids, e.g.:

> This week we'll focus on these stories: #1234, #5678 and #9012

2. Execute this extension to generate HTML or Markdown links for each issue:

```
This week we'll focus on these stories: <a href="https://<mytracker>/issue/1234">#1234</a>, <a href="https://<mytracker>/issue/5678">#5678</a> and <a href="https://<mytracker>/issue/9012">#9012</a>
```

or

```
This week we'll focus on these stories: [#1234](https://<mytracker>/issue/1234), [#5678](https://<mytracker>/issue/5678) and [#9012](https://<mytracker>/issue/9012)
```