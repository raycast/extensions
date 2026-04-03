# Google Finance Changelog

## [Improved search loading] - 2026-03-27

- Render search rows immediately while quote data is still loading
- Add a loading icon (`Icon.EllipsisVertical`) for pending quote rows
- Stream quote updates progressively so initial results appear faster
- Prioritize US exchanges before global fallbacks for quicker first quote resolution
- Fix TypeScript build error by removing unsupported accessory `text.tooltip` fields

## [Updated dependencies] - 2026-03-25

## [Initial Version] - 2026-03-25

- Search stocks by ticker symbol across major global exchanges
- View real-time quotes with price, change, and market state
- Save favorite stocks with persistent storage
- Reorder favorites with keyboard shortcuts
- Detail panel with price, previous close, open, change, and market cap
- Open any stock directly in Google Finance
