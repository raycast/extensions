<a name="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
    <img src="media/logo.png" alt="Logo" width="80" height="80">

<h3 align="center">Cheatsheets Remastered</h3>

  <p align="center">
    A remastered Cheatsheets extension with enhanced functionality, custom sheet creation, and an improved browsing experience.
    <br />
    <a href="./ROADMAP.md"><strong>Explore the roadmap »</strong></a>
    <br />

  </p>
</div>

<details>
  <summary>Table of Contents</summary>

_Last Updated 2025-08-16_
<!-- toc -->

- [About The Project](#about-the-project)
  - [Features](#features)
  - [Built with](#built-with)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Usage](#usage)
- [Back Matter](#back-matter)
  - [Roadmap](#roadmap)
  - [Contributing](#contributing)
  - [License](#license)

<!-- tocstop -->
  
</details>

<!-- ABOUT THE PROJECT -->
## About The Project
<div align="center">
    <img src="media/cheatsheets-remastered-1.png" alt="Screenshot" width="100%" height="auto">
  </div>
  
**Cheatsheets Remastered** is a modern [Raycast extension](https://github.com/raycast/extensions) to quickly search, create, and manage cheatsheets. It ships with curated [DevHints](https://devhints.io/) content and lets you keep your own sheets locally. Perfect for fast recall without leaving your keyboard.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Features

- Search across custom and DevHints cheatsheets with fast filtering and tags
- Create, edit, copy, and organise markdown cheatsheets
- Local-first storage for your custom content.
- Large base of sheets integrated out of the box
- Rich tagging and favouriting with icon mapping for quick discovery

### Built with

- Raycast API
- TypeScript + React
- Node.js / npm

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting started

### Prerequisites

- macOS with Raycast installed

### Install

#### From Raycast Store (production):
Install via [Raycast Store](https://www.raycast.com/smcnab1/cheatsheet-remastered)

#### From source (development):

```bash
npm install
npm run dev
```

Build locally:

```bash
npm run build
```

### Usage

- Show Cheatsheets: browse all
- Search Cheatsheets: search with filters and tags
- Create Custom Cheatsheet: compose new markdown
- Manage Custom Cheatsheets: edit, duplicate, delete, export
- Copy Cheatsheet: quick search and copy to clipboard

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Back Matter

<!-- ROADMAP -->
### Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned work.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

<a name="contributing"></a>

### Contributing

Contributions welcome — especially to expand and improve the default cheatsheets.

- Add/Update default cheatsheets: edit markdown under `assets/cheatsheets/`
- Tag updates: map new tags in `src/default-tags.ts`
- Icons: add topic icons under `assets/` and optionally run `npm run normalize:icons`

PRs should briefly state:
- What changed and why
- Which cheatsheets were added/updated
- Any new tags introduced

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### License

This project is licensed under the [MIT License](LICENSE).

<p align="right">(<a href="#readme-top">back to top</a>)</p>
