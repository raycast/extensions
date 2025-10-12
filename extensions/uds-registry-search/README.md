# UDS Registry Search

A Raycast extension for searching and browsing packages in the UDS Registry (registry.defenseunicorns.com).

## Features

- **Search Packages**: Browse and search through all available packages in the UDS Registry catalog
- **Package Details**: View detailed information about each package including:
  - Available versions and architectures
  - Package metadata and flavors
- **Public & Authenticated Access**: Works without authentication by default, with optional token support for private package access
- **Configurable Registry**: Support for custom registry URLs

## Installation

### For Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. The extension will appear in Raycast

### For Production

Run `npm run build` to build the extension for production use.

## Configuration

Open Raycast preferences for this extension to configure:

### Registry URL (Optional)
- **Default**: `https://registry.defenseunicorns.com`
- Set a custom registry URL if you're using a different UDS Registry instance

### Session Cookie (Optional)
- **Default**: None (public access)
- For authenticated access to private packages and enhanced data, you can provide your session cookie from your authenticated browser session

⚠️ **SECURITY WARNING**: This cookie provides full access to your UDS Registry account. DO NOT backup, sync, or share Raycast preferences containing this cookie. Store it only on your local machine and treat it like a password.

#### How to get your session cookie:

1. Log in to the UDS Registry at https://registry.defenseunicorns.com through your browser (via Keycloak SSO)
2. Open your browser's Developer Tools (F12 or Cmd+Option+I)
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. In the left sidebar, expand **Cookies** and select `https://registry.defenseunicorns.com`
5. Find the cookie named `uds_session`
6. Copy the **Value** of the `uds_session` cookie
7. Paste it into the "Session Cookie" field in Raycast preferences

**Important Notes:**
- The cookie may expire after some time, and you'll need to retrieve a fresh one
- Never commit or share this cookie value
- Disable Raycast preferences sync/backup if you store this cookie
- This is a temporary solution until OAuth support is available

## Usage

1. Open Raycast (Cmd+Space or your configured hotkey)
2. Type "Search UDS Registry" or start typing package names
3. Browse through the list of packages
4. Press Enter or click to view detailed package information

### Keyboard Shortcuts

**Search View:**
- `Enter` - View package details
- `Cmd+O` - Open package repository in browser
- `Cmd+C` - Copy package reference (org/package)
- `Cmd+Shift+C` - Copy package name only
- `Cmd+V` - Copy latest version tag

**Package Detail View:**
- `Cmd+I` - Insert package reference with version selection
- `Cmd+C` - Copy package reference with version selection
- `Cmd+Shift+C` - Copy package name
- `Cmd+V` - Copy latest version tag
- `Cmd+O` - Open repository in browser

**Version Selection View:**
- `Cmd+I` - Insert OCI reference for selected version
- `Cmd+C` - Copy OCI reference for selected version
- `Cmd+B` - Go back to flavor selection (when applicable)

## Development

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run lint` - Run linter
- `npm run fix-lint` - Fix linting issues

## Employment Disclosure
Although I am currently employed by [Defense Unicorns](https://defenseunicorns.com/), this project is not affiliated with the company or an officially supported product.

## License

MIT
