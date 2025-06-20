# 🚀 Publishing to Raycast Store - Step by Step Guide

## Prerequisites

Before publishing, you need:

1. **Raycast Account**: Sign up at [raycast.com](https://raycast.com)
2. **Valid Username**: Find your username in your Raycast profile
3. **Extension Ready**: Built and tested locally

## Step 1: Update Author Information

Update the `author` field in `package.json` with your actual Raycast username:

```json
{
  "author": "your-raycast-username"
}
```

To find your username:
- Open Raycast → Settings → General → Account
- Or visit [raycast.com](https://raycast.com) and check your profile URL

## Step 2: Pre-publish Validation

Run these commands to ensure everything is ready:

```bash
# Install dependencies
npm install

# Lint and format
npm run fix-lint

# Build the extension
npm run build
```

## Step 3: Publish to Store

```bash
npm run publish
```

This will:
1. Validate your extension
2. Guide you through authentication if needed
3. Submit for review to Raycast team

## Step 4: Review Process

After submission:
- Raycast team reviews your extension (usually 1-3 days)
- You'll receive feedback if changes are needed
- Once approved, it goes live in the store

## Current Extension Status ✅

Your extension is ready for publication with these features:

### ✨ **Core Features**
- 🛡️ Protective put strategy calculator
- 📊 Real-time stock prices (Yahoo Finance)
- 💰 Live options data (Alpha Vantage API)
- 🎯 Smart position sizing with loss caps
- 📋 Detailed option contract information

### 📋 **Option Details Display**
- Contract specifications (strike, expiration)
- Premium breakdown (bid/ask/mid)
- Market data (volume, open interest, IV)
- Data quality indicators

### 🔧 **User Experience**
- Professional trading-style interface
- Copy-friendly results
- Configurable preferences
- Input validation and error handling

## Required API Key

Users will need a free Alpha Vantage API key:
- Sign up at: https://www.alphavantage.co/support/#api-key
- Free tier includes 25 requests/day
- No credit card required

## Next Steps

1. **Get your Raycast username** from your profile
2. **Update package.json** with correct author
3. **Run npm run publish**
4. **Wait for review** (1-3 days typically)

The extension is production-ready with comprehensive options data display!
