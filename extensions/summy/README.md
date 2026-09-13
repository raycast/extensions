# Summy

Save links, text, images, and PDFs from your Mac, then find and read their summaries without leaving Raycast.

## Setup

Summy for Raycast uses the same account as the Summy iPhone app.

1. Sign in to Summy on your iPhone.
2. Open **Settings** in Summy.
3. Under **Raycast**, tap **Copy Raycast Token**.
4. Open the Summy extension preferences in Raycast and paste it into **Summy Session Token**.

The API address is built into the extension. Raycast stores the token as a password preference in its encrypted local database.

## Commands

### Save to Summy

Choose what you want to save:

- **A Link** accepts an `http` or `https` URL.
- **Some Text** accepts pasted or typed text with an optional title.
- **A File** accepts images, PDFs, and text-based files such as Markdown, JSON, CSV, and plain text.

Summy saves your selection and begins summarising it straight away.

### Browse Summy

Search saved titles, summaries, and sources, or filter the list by type. Open an item to read its full summary and suggested questions inside Raycast. You can also open the original source, copy the summary, retry summarisation, or delete the item.
