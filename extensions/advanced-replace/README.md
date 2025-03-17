# Regex Replace

Replace the current selection or clipboard entry using custom regex entries.

## Examples

### Github Image Replacements

Replace the markdown version of an image with the HTML `<img>` version.

#### Output

```
<img src="{src}" alt="{alt}" width="400" height="300">
```

#### Item 1 - key: src

```
\!\[.*\]\((.*)\)
```

#### Item 2 - key: alt

```
\!\[(.*)\]
```

<video autoplay muted looped src="./media/github-image-replacement.mp4">
