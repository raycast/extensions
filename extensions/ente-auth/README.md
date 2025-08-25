# Ente Auth - Raycast Extension

A fully-featured Raycast extension for [Ente Auth](https://ente.io/auth) that provides seamless access to your TOTP (Time-based One-Time Password) codes directly from Raycast. This extension offers complete offline functionality, secure authentication, and matches the official Ente Auth web application experience.

## ✨ Features

- 🔐 **Secure SRP Authentication** - Uses the same Secure Remote Password protocol as the official Ente apps
- 📱 **Complete Offline Support** - TOTP codes work perfectly without internet connection once synced
- 🔄 **Smart Sync** - Intelligent synchronization that combines incremental and complete sync as needed
- 💾 **Session Persistence** - Stay logged in across Raycast restarts
- 🗂️ **Smart Filtering** - Automatically filters out deleted/trashed items
- ⚡ **Performance Optimized** - Minimal resource usage with efficient timer management
- 🎨 **Official UI Match** - Display format matches the official Ente Auth web application
- 🔀 **Multi-Account Support** - Secure account switching with proper key isolation
- 📧 **Email OTP Support** - Alternative login method for accounts without SRP

## 🚀 Quick Start

1. **Install** the extension in Raycast
2. **Login** using your Ente Auth credentials
3. **Sync** your authenticator codes (requires internet connection)
4. **Access codes offline** - codes will work without internet once synced

## 📋 Commands

### Main Commands

- **`Ente Auth`** - Authentication and view codes

### Actions Available

- **Copy Code** - Copy the current TOTP code to clipboard
- **Sync with Server** - Intelligent sync that handles all scenarios automatically
- **Refresh** - Manually refresh code display
- **Logout** - Sign out and clear session data

## 🔧 Authentication Methods

### SRP Authentication (Recommended)

- Secure Remote Password protocol
- Same security model as official Ente applications
- No password transmitted to server

### Email OTP Authentication

- Alternative method for compatible accounts
- Verification code sent to registered email
- Automatic fallback when SRP unavailable

## 💡 Usage

### First Time Setup

1. Run `Login to Ente Auth` command
2. Enter your Ente Auth email and password
3. Complete authentication process
4. Use `Ente Auth Codes` to sync and view your codes

### Daily Usage

- Open Raycast and type "auth" or "ente"
- Browse your TOTP codes with live countdown timers
- Copy codes with ⌘+C or click "Copy Code"
- Codes update automatically every 30 seconds

### Offline Usage

- Once synced, codes work completely offline
- Session persists across network disconnections
- No automatic logout when WiFi unavailable
- Manual sync available when back online

## 🏗️ Architecture

### Tech Stack

- **Frontend**: TypeScript 5.x, Raycast API
- **Cryptography**: libsodium-wrappers-sumo, argon2-wasm
- **Authentication**: fast-srp-hap (SRP protocol)
- **Backend**: Go with Ente Museum server, PostgreSQL

### Key Components

- **Authentication Service** - Handles SRP and email OTP login flows
- **Storage Service** - Manages secure local data persistence
- **API Client** - Communicates with Ente servers
- **Crypto Service** - Handles all cryptographic operations
- **TOTP Utils** - Generates time-based codes

### Security Model

```
Password → Argon2 → KEK → Login Key → SRP Authentication → Session Token
         ↓
    Master Key → Secret Key → Authenticator Key → Decrypted TOTP Data
```

## 🔒 Security Features

- **Zero-Knowledge Architecture** - Passwords never leave your device
- **End-to-End Encryption** - All data encrypted with client-side keys
- **SRP Protocol** - Industry-standard secure authentication
- **Local Key Caching** - Secure session management
- **Cross-Account Isolation** - Proper key separation between accounts

## 📱 Offline Functionality

The extension is designed as an **offline-first** authenticator app:

- ✅ TOTP codes generated locally using cached data
- ✅ No network dependency for code generation
- ✅ Session persistence across connectivity changes
- ✅ Graceful handling of network failures
- ✅ Manual sync when connectivity restored

## 🐛 Troubleshooting

### Common Issues

**"Passkey not supported" Error**

- Disable passkey authentication in your Ente account
- Login using password authentication
- Re-enable passkey after successful login

**No Codes Showing**

- Ensure you've completed initial sync with internet connection
- Try the "Sync with Server" action to refresh data
- Check if codes were deleted in other Ente applications

**Login Issues**

- Verify email and password are correct
- Check internet connection for initial authentication
- Try email OTP method if SRP fails

**Performance Issues**

- Extension optimized for minimal resource usage
- Codes refresh every 30 seconds, countdown updates every second
- Clean up occurs automatically

## 🔄 Sync Behavior

### Smart Sync Logic

1. **Incremental Sync** - Fast sync of only changed data
2. **Automatic Fallback** - Complete refresh if no data found
3. **User Feedback** - Clear status messages during sync
4. **Offline Handling** - Graceful degradation when offline

### When to Sync

- After adding new codes in other Ente applications
- When codes appear missing or outdated
- After extended offline periods
- When switching between accounts

## 🏃‍♂️ Development

### Building from Source

```bash
cd ente-auth
npm install
npm run dev    # Development mode
npm run build  # Production build
```

### Project Structure

```
ente-auth/
├── src/
│   ├── index.tsx           # Main extension entry
│   ├── login.tsx          # Login command
│   ├── services/          # Core services
│   │   ├── api.ts         # API client
│   │   ├── authenticator.ts # Authenticator service
│   │   ├── srp.ts         # SRP authentication
│   │   └── storage.ts     # Local storage
│   └── utils/
│       └── totp.ts        # TOTP generation
├── package.json
└── README.md
```

## 📊 Performance

- **Startup Time**: < 100ms with session restoration
- **Memory Usage**: Minimal footprint with efficient caching
- **Network Usage**: Only during explicit sync operations
- **Battery Impact**: Optimized timer management

## 🤝 Contributing

This extension is part of the larger Ente ecosystem. For contributions:

1. Follow the existing code patterns
2. Maintain security standards
3. Test offline functionality thoroughly
4. Update AGENTS.md with implementation notes

## 📄 License

This project is licensed under the MIT License.

---

**Note**: This extension provides the same security and functionality as the official Ente Auth applications while being optimized for the Raycast environment.
