# rhttp - HTTP Client for Raycast

A powerful HTTP client built for Raycast. Test APIs, manage environments, and chain requests - all without leaving your keyboard.
[![Raycast Store](https://img.shields.io/badge/Raycast-Store-red)](https://raycast.com/SebastianJarsve/rhttp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### 🚀 Full HTTP Client

- Support for **GET**, **POST**, **PUT**, **PATCH**, **DELETE**, and **GraphQL**
- Custom headers, query parameters, and request bodies
- JSON and Form Data body types
- Cookie management across requests
- SSL verification control for local development

### 🔗 Request Chaining

- **Pre-request actions** - Run requests before your main request
- **Response actions** - Extract data from responses and save to variables
- Perfect for authentication flows (login → get token → use token)

### 🌍 Environment Management

- Multiple environments (Dev, Staging, Production, etc.)
- Variable substitution with `{{placeholder}}` syntax
- Secret variables (hidden values)
- Temporary variables scoped to request chains

### 📦 Collections

- Organize requests into collections
- Collection-level headers applied to all requests
- Import/export collections for sharing
- Sort requests by name, method, or URL

### 📜 Request History

- Automatic history tracking
- View past requests and responses
- Re-run requests from history
- Toggle history recording on/off

### ⚡ Power User Features

- **Import from cURL** - Paste cURL commands to create requests
- **Export as cURL** - Copy any request as a cURL command
- **Request cancellation** - Stop long-running requests
- **Backup/restore** - Export all data with timestamps
- **Open in editor** - View responses in your preferred editor
- **Keyboard-first** - Every action has a shortcut

## 🚀 Quick Start

1. Install from the [Raycast Store](https://raycast.com/SebastianJarsve/rhttp)
2. Open Raycast and type "rhttp" or "HTTP Request"
3. Press `Cmd+K` to open the action panel
4. Select "New Request" to create your first request
5. Enter a URL (e.g., `https://api.github.com/users/github`)
6. Press `Cmd+K` and select "Run Request"

### Creating Your First Environment

1. Press `Cmd+K` to open the action panel
2. Select "Manage Environments"
3. Create a new environment (e.g., "Development")
4. Add variables like `baseUrl` = `https://api.example.com`
5. Use `{{baseUrl}}/users` in your requests

**Tip:** Press `Cmd+K` anytime to see all available actions and their keyboard shortcuts!

## 🔧 Troubleshooting

### "Host Not Found" Error

- Check your internet connection
- Verify VPN is connected if required
- Ensure the URL is correct

### "Connection Refused" Error

- Make sure the server is running
- Check if you're using the correct port
- Verify firewall settings

### SSL Certificate Errors

- For local development, enable "Disable SSL Verification" in preferences
- ⚠️ **Warning**: Only use this for local development, never in production

### Variables Not Working

- Ensure you've selected an environment
- Check variable syntax: `{{variableName}}` (no spaces)
- Verify the variable exists in the current environment

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

Built with:

- [Raycast API](https://developers.raycast.com/)
- [Axios](https://axios-http.com/)
- [Zod](https://zod.dev/)
- [zod-persist](https://github.com/sebastianjarsve/zod-persist)

---

Made with ❤️ for the Raycast community
