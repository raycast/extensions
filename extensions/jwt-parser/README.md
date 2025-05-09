# JWT Parser

A developer tool to decode and validate JWT tokens directly from your clipboard. Built for Raycast.

## Features

- 🔍 **Automatic Clipboard Detection**: Automatically detects JWT tokens from your clipboard
- 🔐 **Token Validation**: Optional validation using a secret key
- 📋 **Structured Data View**: View token payload in a clean, organized table format
- ⚡️ **Quick Access**: Parse and validate tokens directly from Raycast
- ❌ **Error Handling**: Clear error display for invalid tokens or validation failures

## Usage

1. Open Raycast and search for "JWT Parser"
2. The extension will automatically detect if you have a JWT token in your clipboard
3. Alternatively, paste your JWT token manually
4. (Optional) Enter a secret key if you want to validate the token's signature
5. View the decoded token information in a structured format

## Token Validation

When providing a secret key for validation:
- A valid token will show a success indicator
- An invalid token will display an error message explaining the issue
- The validation status is clearly visible in the metadata panel

## Data Display

The token information is organized into three main sections:
1. **Header**: Contains algorithm and token type
2. **Payload**: Shows the token's claims in a table format
3. **Signature**: Displays validation status when a secret key is provided

## Tips

- You can copy individual fields from the decoded token
- The extension preserves your last used secret key for convenience
- Use the refresh button to re-check clipboard content
- Toggle between raw and formatted views of the token data

## Troubleshooting

If you encounter any issues:
1. Ensure your token follows the JWT format (xxx.yyy.zzz)
2. Check that your secret key matches the one used to sign the token
3. Verify that the token hasn't expired
4. Make sure all required segments (header, payload, signature) are present

## Support

For bug reports or feature requests, please visit the [GitHub repository](https://github.com/raycast/extensions/tree/main/extensions/jwt-parser).

## About

This extension is built with Raycast's API and uses industry-standard JWT libraries for secure token handling.