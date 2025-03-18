# LogWise - Raycast Plugin

A streamlined Raycast plugin for generating LOKI queries and opening the LOKI dashboard directly in your browser. (Designed specially for company)

## Features

- Clean, minimal interface focused on query generation
- Generate complex LOKI queries with simple inputs
- Switch between Staging and Production environments
- Filter by log levels (INFO, WARN, ERROR)
- Case-sensitive or case-insensitive search options
- Automatically opens the dashboard in your browser

## Usage

1. Enter the Service Name (maps to the namespace in the query)
2. Enter the search words/patterns you want to find in logs
3. Select log levels (INFO, WARN, ERROR) to filter by
4. Choose between Production or Staging environment
5. Optionally enable case-insensitive search
6. Click "Generate Query and Open Dashboard"

The plugin will generate the LOKI query, open the appropriate dashboard in your browser with the query pre-filled.

## Development

This extension is built with Raycast's extension API and React. The URL generation code uses the built-in `URL` API for cleaner code organization and proper encoding.

## License

MIT License


## Author

zizheng.lyu@wise.com
