# DBLP Search

A Raycast extension to search the [DBLP computer science bibliography](https://dblp.org)
by author name and browse their publications.

## Features

- **Search Authors** – type a name to find matching DBLP authors (with affiliation hints).
- **Browse Publications** – select an author to see all their publications, newest first.
- **Filter by type** – journal articles, conference papers, books, theses, and more.
- **Quick actions**:
  - Open a publication via its DOI / PDF link.
  - Open the record on DBLP.
  - Copy the publication link, title, or a plain-text citation.
  - Open the author's DBLP page.

## How it works

- Authors come from the DBLP author search API
  (`https://dblp.org/search/author/api`).
- Publications are loaded from each author's person record
  (`https://dblp.org/pid/<pid>.xml`) and parsed locally.

No API key is required.

## Development

```bash
npm install
npm run dev     # run in Raycast
npm run build   # type-check and build
npm run lint    # lint & format check
```

## Credits

Bibliographic data provided by [dblp.org](https://dblp.org), released under the
[ODC-BY 1.0](https://opendatacommons.org/licenses/by/1-0/) license.

The extension icon is part of the [CoreUI Icons](https://github.com/coreui/coreui-icons) released under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.en) license.
