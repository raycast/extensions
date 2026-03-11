# DOGEAR

Fuzzy search bookmarks from a YAML config file and open them in your browser.

## Setup

1. Create a `config.yaml` file anywhere on your system:

```yaml
bookmarks:
  - title: "GitHub"
    url: "https://github.com"
  - title: "Stack Overflow"
    url: "https://stackoverflow.com"
  - title: "Raycast Store"
    url: "https://www.raycast.com/store"
```

2. Open the extension preferences and set the **Config File Path** to your `config.yaml` location.

## Features

- Fuzzy search through all your bookmarks
- Displays favicons for each bookmark
- Open bookmarks in your default browser
- Copy bookmark URLs to clipboard
