<div align="right">

[![doi2bib — Raycast extension][doi2bib-raycast-badge]][doi2bib-raycast-link]

</div>

<div align="center" style="width: 100%; padding: 100px; box-sizing: border-box;">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/logo.svg" />
    <img src="assets/logo.svg" width="100%" alt="doi2bib" style="display: block;" />
  </picture>
</div>

<!-- <p align="center">
  <strong>Convert DOI → BibTeX in one keystroke</strong>
</p> -->

## Overview

Sometimes you already have the DOI and just want the reference without opening a full citation manager. `doi2bib` keeps that part simple: paste a DOI, get a clean entry, copy it, and move on. A single, simple function. This minimalist approach allows you to  focus on a specific goal without getting bogged down in unnecessary details.

## Install

Add to Raycast via `raycast://manage-extensions?names=doi2bib` or install from source:

```bash
git clone https://github.com/molchalih/doi2bib.git
cd doi2bib && npm install
```

## What It Does

- detects a DOI from your clipboard
- fetches the BibTeX entry from `doi.org`
- keeps a local history of recent lookups
- lets you copy an entry or export your history

[doi2bib-raycast-badge]: https://img.shields.io/badge/Raycast-doi2bib-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[doi2bib-raycast-link]: raycast://manage-extensions?names=doi2bib

<!-- raycast://manage-extensions?names=doi2bib -->