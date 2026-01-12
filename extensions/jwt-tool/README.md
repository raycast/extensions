# Raycast JWT Extension

A Raycast extension for encoding and decoding JSON Web Tokens (JWT).

## Features

### Encode JWT

- Create JWT tokens with custom headers and payloads
- Support for multiple algorithms (HS256, HS384, HS512, RS256, RS384, RS512)
- Real-time token generation
- Copy generated tokens to clipboard

### Decode JWT

- Inspect JWT tokens without verification
- Verify tokens with secret key
- View decoded header and payload sections
- Copy individual sections to clipboard

## Installation

1. Install the extension from the Raycast Store or build it locally:

   ```bash
   git clone https://github.com/your-repo/jwt.git
   cd jwt
   npm install
   npm run dev
   ```

2. The extension will be available in your Raycast launcher as "JWT"

## Usage

### Encode a JWT Token

1. Open Raycast and run the "Encode" command
2. Enter the JWT header (default: HS256 algorithm)
3. Enter the payload data as JSON
4. Set your secret key
5. Choose the signing algorithm
6. Click "Encode JWT" to generate the token

### Decode a JWT Token

1. Open Raycast and run the "Decode" command
2. Paste the JWT token you want to inspect
3. Optionally enable verification and provide secret key
4. Click "Decode JWT" to view the token contents

## Supported Algorithms

- **HS256**: HMAC using SHA-256
- **HS384**: HMAC using SHA-384
- **HS512**: HMAC using SHA-512
- **RS256**: RSASSA-PKCS1-v1_5 using SHA-256
- **RS384**: RSASSA-PKCS1-v1_5 using SHA-384
- **RS512**: RSASSA-PKCS1-v1_5 using SHA-512

## Configuration

The extension uses standard JWT practices:

- Default header includes algorithm and token type
- Payload can contain any valid JSON data
- Secret keys should be kept secure

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## License

MIT
