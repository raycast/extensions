# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension that updates Claude OAuth tokens as GitHub repository secrets. It accepts Claude OAuth JSON data and securely stores the access token, refresh token, and expiration time as encrypted secrets in any GitHub repository.

## Architecture

### Main Component

**UpdateClaudeTokens** (src/claude-token-update.tsx:91-216)
- Single form component for updating Claude tokens
- Accepts repository URL and Claude OAuth JSON
- Updates GitHub repository secrets

### Core Functions

- `parseRepoUrl()` (src/claude-token-update.tsx:28-32): Parses GitHub repository URL
- `getPublicKey()` (src/claude-token-update.tsx:34-40): Retrieves repository public key for encryption
- `encryptSecret()` (src/claude-token-update.tsx:42-51): Encrypts secrets using libsodium sealed box
- `updateRepositorySecrets()` (src/claude-token-update.tsx:53-89): Updates all three Claude secrets

### Dependencies

- **@raycast/api**: Raycast framework
- **@octokit/rest**: GitHub API client
- **tweetnacl**: Cryptography library for secret encryption
- **tweetnacl-sealedbox-js**: Sealed box implementation for GitHub secrets

## Development

### Setup
```bash
pnpm install
```

### Commands
```bash
# Development
pnpm run dev

# Build
pnpm run build

# Lint
pnpm run fix-lint

# Publish
pnpm run publish
```

### Testing
Run in Raycast development mode:
```bash
pnpm run dev
```

## Configuration

### Environment Variables
1. **GITHUB_TOKEN**: GitHub personal access token (required)
   - Must have `repo` scope for updating secrets
   - Set in your shell environment or Raycast preferences

## Key Features

1. **Input Handling**:
   - Repository URL parsing (supports github.com URLs)
   - Claude OAuth JSON validation
   - Automatic clipboard paste support

2. **Secret Management**:
   - Creates/updates three GitHub secrets:
     - `CLAUDE_ACCESS_TOKEN`
     - `CLAUDE_REFRESH_TOKEN`
     - `CLAUDE_EXPIRES_AT`
   - Uses libsodium sealed box encryption
   - Secure transmission to GitHub

3. **User Experience**:
   - Loading states with toast notifications
   - Clear error messages
   - Auto-return to root after success

## Error Handling

- Validates GitHub token availability
- Validates repository URL format
- Validates Claude OAuth JSON structure
- Shows toast notifications for all errors
- Detailed error messages for debugging

## Future Improvements

1. Add bulk repository update mode
2. Support for custom secret names
3. Add validation for GitHub token permissions
4. Update README.md with proper documentation
5. Add support for GitHub Enterprise URLs

## Important Notes

- Requires GITHUB_TOKEN environment variable with `repo` scope
- The README.md appears to be from a "Bug Tracker" template and needs updating
- Both npm and pnpm lock files exist (should stick to pnpm only)
- The extension securely encrypts all secrets before storing them in GitHub