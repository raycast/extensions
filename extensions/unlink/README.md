# UnLink

## UnLink - Clean URLs Instantly

Automatically cleans messy URLs in your clipboard by removing tracking parameters, decoding email service redirects, extracting clean email addresses from mailto links, and adding descriptive page titles - instantly updates your clipboard with the clean result.
Features

URL Cleaning: Removes tracking parameters (utm_*, fbclid, gclid, etc.)
Email Redirect Decoding: Decodes Base64 encoded email service redirects (Customer.io, etc.)
Mailto Extraction: Extracts clean email addresses from mailto: links
Page Title Addition: Fetches and adds descriptive page titles
Security First: Only processes HTTP/HTTPS URLs with proper validation
Instant Updates: Automatically updates your clipboard with clean results

## Installation

Install from the Raycast Store or clone this repository for development.
Usage

Copy any messy URL to your clipboard
Run "UnLink" command in Raycast
Your clipboard is instantly updated with the clean URL

## Examples

Before:
https://example.com/page?utm_source=newsletter&utm_medium=email&fbclid=abc123&gclid=xyz789
After:
Amazing Product Launch - https://example.com/page

Email Cleaning:
mailto:user@example.com?subject=Hello → user@example.com
Email Redirect Decoding:
https://track.customer.io/e/c/encoded_redirect → https://actualsite.com/article

## Development
bashnpm install
npm run dev

## License
MIT License - see LICENSE file for details.

## Contributing
Pull requests welcome! Please ensure your code follows the existing style and includes proper error handling.