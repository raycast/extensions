# Brreg (Norwegian Company Register) Raycast Extension

Search and retrieve information about Norwegian companies (Enhetsregisteret) directly from the Raycast command bar. The extension uses the official [Brønnøysund Register Center (Brreg)](https://www.brreg.no) API to find companies by name or organisation number.

## Features

- **Search by Name**: Type any part of a company’s name to view matching results from Brreg.
- **Search by Organisasjonsnummer**: Type a 9-digit organisation number to retrieve an exact match.
- **Partial Numeric Search**: If you type fewer than 9 digits, the extension can optionally use Brreg's full-text search (`q` param) to show partial matches.
- **Copy Data**: Copy the organisation number or address with a single action.
- **Open in Browser**: Quickly jump to the company’s details page in the Brønnøysund Register website.

## Requirements

- **No credentials or API keys** are required. Brreg provides open, free access to its Enhetsregisteret endpoints.

## Privacy & Data Usage

- No user credentials or passwords are required by this extension.
- The extension sends your search query (name or number) to the public Brreg API to retrieve matching entities.
- All information collected from the user is used solely to connect to Brreg and improve the extension’s response.
- We do not store, share, or process personal data outside of fulfilling these requests.

Made with 🫶 by [kynd](https://kynd.no)
