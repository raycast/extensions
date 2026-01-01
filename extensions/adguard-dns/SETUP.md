# Quick Setup Guide

This document provides a quick reference for setting up the AdGuard DNS Helper Raycast extension.

## ✅ What's Complete

The extension has been fully implemented with:

- ✅ Project structure initialized
- ✅ TypeScript configuration
- ✅ Package.json with tools and AI instructions
- ✅ Shared AdGuard API utilities (`src/utils/adguard-api.ts`)
- ✅ Get query log tool (`src/get-query-log.ts`)
- ✅ Unblock domain tool with confirmation (`src/unblock-domain.ts`)
- ✅ Comprehensive README
- ✅ ESLint and Prettier configuration

## ⚠️ Before You Start

### 1. Add Extension Icon

You **must** create an icon before the extension will work in Raycast:

```bash
# Icon requirements:
# - Format: PNG
# - Size: 512x512 pixels
# - Location: assets/extension-icon.png
```

See `assets/ICON_README.md` for detailed instructions on creating the icon.

### 2. Get AdGuard DNS Credentials

You need three pieces of information:

#### Access Token and Refresh Token

```bash
curl -X POST https://api.adguard-dns.io/oapi/v1/oauth_token \
  -H "Content-Type: application/json" \
  -d '{"username": "your_email@example.com", "password": "your_password"}'
```

Save the `access_token` and `refresh_token` from the response.

#### DNS Server ID

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.adguard-dns.io/oapi/v1/dns_servers
```

Copy the `id` field (e.g., `"dXXXXXXXXX"`).

## 🚀 Running the Extension

### 1. Install Dependencies (if not already done)

```bash
cd /Users/kevin/code/adguard/adguard-raycast
npm install
```

### 2. Start Development Mode

```bash
npm run dev
```

This will:
- Import the extension into Raycast
- Enable hot reloading for development
- Open Raycast settings

### 3. Configure Preferences

In Raycast:
1. Go to Settings → Extensions → AdGuard DNS Helper
2. Fill in the three required fields:
   - AdGuard API Token
   - AdGuard Refresh Token
   - DNS Server ID

### 4. Test the Extension

Open Raycast and type:

```
ask @adguard-dns Netflix isn't working
```

The AI should:
1. Call the `get-query-log` tool
2. Analyze blocked domains
3. Present findings with reasoning
4. Ask for confirmation before unblocking
5. Show confirmation dialog
6. Unblock domains after approval

## 🧪 Testing Workflow

### Test Query Log Tool

```
ask @adguard-dns Show me what's been blocked in the last 10 minutes
```

Expected: List of blocked domains with timestamps

### Test Unblock Tool

```
ask @adguard-dns Unblock example.com
```

Expected:
1. AI explains what will happen
2. Confirmation dialog appears
3. After approval, domain is whitelisted
4. Success message displayed

### Test Intelligent Analysis

```
ask @adguard-dns My banking app won't load
```

Expected:
1. AI fetches recent logs
2. AI identifies potential culprits (bank domains, CDNs, auth providers)
3. AI presents ranked findings with reasoning
4. AI waits for user confirmation
5. AI unblocks confirmed domains

## 📁 Project Structure

```
adguard-raycast/
├── src/
│   ├── get-query-log.ts          # Fetches DNS query logs
│   ├── unblock-domain.ts          # Unblocks domains (with confirmation)
│   └── utils/
│       └── adguard-api.ts         # Shared API utilities
├── assets/
│   ├── extension-icon.png         # ⚠️ REQUIRED: Add 512x512 PNG icon
│   └── ICON_README.md             # Instructions for creating icon
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
├── eslint.config.mjs              # ESLint config
├── .prettierrc.json               # Prettier config
├── README.md                      # Full documentation
└── SETUP.md                       # This file
```

## 🔧 Development Commands

```bash
# Start development mode (hot reload)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Auto-fix linting issues
npm run fix-lint

# Publish to Raycast Store (requires review)
npm run publish
```

## 🐛 Common Issues

### "Cannot read properties of undefined (reading 'forEach')"

This error appears when the extension icon is missing. Add `assets/extension-icon.png` to resolve.

### "Token is not configured"

Make sure all three preferences are filled in Raycast Settings → Extensions → AdGuard DNS Helper.

### "Token expired"

The extension automatically refreshes tokens. Verify your refresh token is correct.

### "DNS server not found" (404)

Double-check your DNS Server ID matches the one from the API.

## 🎯 Next Steps

1. **Add Icon**: Create and add `assets/extension-icon.png`
2. **Test Locally**: Run `npm run dev` and test the extension
3. **Iterate**: Make adjustments based on how the AI behaves
4. **Optional**: Publish to Raycast Store for others to use

## 📚 Additional Resources

- [Full README](./README.md) - Complete documentation
- [Raycast API Docs](https://developers.raycast.com)
- [AdGuard DNS API Docs](https://api.adguard-dns.io/static/swagger/openapi.json)

## 🤝 Related Projects

This extension is adapted from:
- [AdGuard DNS Mastra Agent](file:///Users/kevin/Code/adguard/adguard-mastra)

Both projects share the same core logic but different AI frameworks (Raycast AI vs Mastra).
