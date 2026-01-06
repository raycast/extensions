# Mask Credentials

A Raycast extension that masks authentication tokens and credentials in curl commands for safe sharing.

## Features

This extension reads text from your clipboard and masks common authentication patterns:

- **Authorization headers**: `Bearer`, `Basic`, `Digest`, etc.
- **API keys**: `X-API-Key`, `X-Auth-Token`, etc.
- **User credentials**: `-u username:password`
- **URL embedded credentials**: `https://user:pass@host`
- **Query parameters**: `api_key=...`, `access_token=...`
- **AWS headers**: `X-Amz-Security-Token`
- **JSON body fields**: `password`, `token`, `api_key`, etc.
- **Cookies**: Session tokens in Cookie headers

## Usage

1. Copy a curl command to your clipboard (from Postman, browser dev tools, etc.)
2. Open Raycast and search for "Mask Credentials"
3. The extension will instantly mask any credentials and copy the sanitized version back to your clipboard
4. Paste the safe curl command wherever you need to share it

## Examples

### Before
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     -H "X-API-Key: sk-1234567890abcdef" \
     https://api.example.com/users
```

### After
```bash
curl -H "Authorization: Bearer [MASKED]" \
     -H "X-API-Key: [MASKED]" \
     https://api.example.com/users
```

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` to start development mode
4. The extension will appear in Raycast

## Development

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run lint` - Check code quality

## Security Note

This extension masks credentials for sharing purposes only. Always be careful with what you share, even when masked.