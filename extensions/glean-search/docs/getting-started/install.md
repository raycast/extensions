# Installation

> **Note:** The extension is pending Raycast Store approval. Install from source for now:

```bash
git clone https://github.com/faizhasim/glean-search.git
cd glean-search
npm install && npm run build
```

Then open **Search Glean** in Raycast (add via `raycast://extensions/faizhasim/glean-search/search-glean` or use **Import Extension** in Raycast).

Once approved, install from the [Raycast Store](https://www.raycast.com/faizhasim/glean-search).

## Development install

If you want to modify the extension or contribute:

### Prerequisites

- [Node.js](https://nodejs.org/) version 22 or later
- npm (ships with Node.js)
- [Raycast](https://raycast.com/) with a developer account

### Steps

```bash
# Clone the repository
git clone https://github.com/faizhasim/glean-search.git
cd glean-search

# Install dependencies
npm install

# Link with Raycast
npm run dev
```

The `npm run dev` command opens Raycast and registers the extension from your local checkout. Any changes you make are reflected immediately.

### Building for distribution

```bash
npm run build
```

This produces a production build that can be published to the Raycast Store.
