# Secure Storage Implementation

## Overview

This document describes the implementation of secure credential storage for the iOS Apps extension. Credentials are now persisted by default for a seamless experience; users can clear credentials any time using the Logout command.

## Changes Made

### 1. Updated Authentication Utilities (`src/utils/auth.ts`)

- Modified to use Raycast's secure storage API (`getPassword`, `setPassword`, `deletePassword`)
- Apple ID continues to be stored in LocalStorage (not sensitive)
- Password is now stored in the system's secure keychain
- 2FA codes are never persisted (as required)

### 2. Updated Login Form (`src/components/forms/AppleLoginForm.tsx`)

- Simplified form (removed "Save credentials" option)
- Credentials are persisted by default for best UX
- The Logout command provides a clear way to remove stored credentials

### 3. Updated Authentication Navigation (`src/hooks/useAuthNavigation.tsx`)

- Modified to always store credentials before attempting login
- If 2FA is required, form pushes inline 2FA and reuses stored credentials
- After successful 2FA, authentication completes and persists

### 4. Added/Confirmed Logout Command (`src/logout.ts`)

- Provides a one-click way to log out and clear credentials
- Attempts `ipatool` revoke (when available), then clears local storage and keychain

## Security Considerations

1. **Password Storage**: Passwords are stored using Raycast's secure storage API, which uses the system keychain
2. **Apple ID Storage**: Apple IDs are stored in LocalStorage (less sensitive than passwords)
3. **2FA Codes**: Never stored, always requested fresh from the user
4. **User Control**: Credentials persist by default; users can clear them via the `Logout` command

## User Experience

1. When logging in, credentials are stored securely by default
2. Subsequent operations will not re-prompt for credentials until logout
3. Use the `Logout` command to revoke sessions (when possible) and clear stored credentials

## Technical Details

- Service name for keychain: `ios-apps-apple-password`
- Apple ID storage key: `appleId` (in LocalStorage)
- Logout command implementation: `src/logout.ts`
- No migration needed as this replaces the previous preferences-based approach
