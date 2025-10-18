# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

WebBlocker is a Raycast extension for macOS that blocks distracting websites by modifying the `/etc/hosts` file to redirect blocked domains to localhost (127.0.0.1). It provides a user-friendly interface for managing website blocking with immediate effect through aggressive DNS cache clearing and browser tab management.

## Common Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript (outputs to repo root)
- **Clean**: `npm run clean` - Removes all compiled files (*.js, *.d.ts, *.map, dist/, lib/)
- **Development**: `npm run dev` - Starts Raycast development mode with hot reload
- **Lint**: `npm run lint` - Runs Raycast's ESLint checks
- **Fix Lint**: `npm run fix-lint` - Auto-fixes linting issues
- **Test**: `npm run test` - Runs Jest test suite
- **Test Watch**: `npm run test:watch` - Runs Jest in watch mode
- **Build Extension**: `./build-extension.sh` - Full build pipeline (clean, install, compile, test, verify)
- **Publish**: `npm run publish` - Publishes extension to Raycast Store

## High-Level Architecture

This is a Raycast extension for macOS that blocks distracting websites by modifying the `/etc/hosts` file to redirect blocked domains to localhost (127.0.0.1).

### Key Architecture Patterns

#### 1. Three-Layer Architecture
The codebase is organized into three layers:

- **UI Layer** (`src/*.tsx`): Raycast command interfaces using React
  - `add-website.tsx`: Form for adding domains
  - `streamlined-enable-blocking.tsx`: Enable blocking command
  - `streamlined-disable-blocking.tsx`: Disable blocking command
  - `view-blocked-sites.tsx`: Domain management interface
  - `refresh-blocking.tsx`: Force re-block and troubleshooting

- **Core Logic Layer** (`src/*.ts`):
  - `streamlinedHostsManager.ts`: Main blocking/unblocking orchestrator
  - `storage.ts`: LocalStorage interface for domain persistence
  - `domainUtils.ts`: Domain validation and sanitization
  - `passwordManager.ts`: Singleton for auth session caching

- **System Integration Layer** (`src/*.ts`):
  - `browserRefresher.ts`: AppleScript-based tab closing/refreshing
  - `browserCacheClearer.ts`: Aggressive DNS and browser cache clearing
  - `statusVerifier.ts`: Verifies actual blocking state from hosts file
  - `biometricAuth.ts`: Touch ID/Face ID authentication with password fallback

#### 2. Core Blocking Flow

When enabling blocking (`streamlinedHostsManager.enableBlocking()`):

1. **Close Blocked Tabs First** (before password prompt!) via AppleScript
2. **Clear Browser Caches** to prevent stale DNS entries
3. **Modify /etc/hosts File** with single AppleScript authentication prompt
   - Creates backup at `/etc/hosts.webblocker.bak`
   - Adds entries tagged with `# WebBlocker`
   - Expands domains to include both www and non-www versions
4. **Flush DNS Aggressively** (multiple methods):
   - System-level: `dscacheutil -flushcache`, `killall -HUP mDNSResponder`
   - Network cycle: Brief disable/enable of active network services
5. **Force Browser DNS Flush** via special browser URLs

Critical: Steps 1-2 happen BEFORE the password prompt to ensure immediate effect.

#### 3. Critical Components

**Domain Expansion** (`streamlinedHostsManager.ts:86-105`):
```typescript
// Automatically adds both www and non-www versions
domains.forEach(domain => {
  const cleanDomain = extractDomain(domain);
  expandedDomains.push(cleanDomain);
  
  if (!cleanDomain.startsWith('www.')) {
    expandedDomains.push(`www.${cleanDomain}`);
  } else {
    expandedDomains.push(cleanDomain.replace(/^www\./, ''));
  }
});
```

**AppleScript Authentication Pattern**:
```typescript
// Single password prompt for entire operation
const applescriptCmd = `osascript -e 'do shell script "${tempScriptPath}" with administrator privileges'`;
await execAsync(applescriptCmd);
```

**Browser Tab Closing** (`browserRefresher.ts:444-467`):
- Uses AppleScript to close tabs in Safari, Chrome, Arc, Edge
- Iterates backwards through tabs to avoid index shifting
- Matches both www and non-www versions of domains

#### 4. Domain Expansion Strategy

Every domain added to the block list is automatically expanded to block both `www` and non-www versions. For example:
- User adds: `youtube.com`
- System blocks: `youtube.com` AND `www.youtube.com`

This is handled in `streamlinedHostsManager.ts` (lines 86-105) and ensures comprehensive blocking regardless of which URL variant users visit.

#### 5. Authentication Pattern

**NEW**: Now uses biometric authentication (Touch ID/Face ID) with automatic password fallback!

```typescript
import { authenticateWithBiometric } from './biometricAuth';

const authResult = await authenticateWithBiometric({
  reason: 'WebBlocker needs to modify system files to block websites',
  fallbackToPassword: true
});

if (authResult.success) {
  // Proceed with authenticated operation
  console.log(`Used ${authResult.usedBiometric ? 'Touch ID/Face ID' : 'password'}`);
}
```

**Features**:
- Attempts Touch ID/Face ID first for faster authentication
- Automatically falls back to password if biometric unavailable
- Clear logging of which authentication method was used
- User can cancel at any point

**Legacy**: A singleton `PasswordManager` exists but is unused. The biometric auth module directly interfaces with macOS authentication.

#### 6. Browser Integration

**Supported Browsers**: Safari, Chrome, Arc, Edge, Firefox, Brave, Opera, Vivaldi

**Tab Management**: Uses AppleScript to:
- Close tabs matching blocked domains (before enabling blocking)
- Refresh tabs after blocking state changes
- Detect running browsers via `pgrep`

**Cache Clearing**: Chromium-based browsers share similar cache paths:
```
~/Library/Application Support/{BrowserPath}/Default/Cache
~/Library/Application Support/{BrowserPath}/Default/Network/Network Persistent State
```

## Important Notes

- **Build Output**: TypeScript compiles to the repository root (not a `dist/` folder) due to `outDir: "./"` in `tsconfig.json`
- **Authentication**: Uses Touch ID/Face ID by default, falls back to password if unavailable
- **Status Synchronization**: Blocking status is now always verified against the actual `/etc/hosts` file to ensure accuracy
- **Password Prompt Timing**: The extension MUST close blocked tabs and clear browser caches BEFORE showing the authentication prompt to ensure immediate blocking
- **Hosts File Tags**: All entries are tagged with `# WebBlocker` for safe removal
- **Backup Location**: `/etc/hosts.webblocker.bak`
- **Network Cycling**: Brief network service toggling is used to drop existing connections - this is more effective than just DNS flushing
- **Browser Process Names**: Be aware of exact process names for detection (e.g., "Google Chrome" not "Chrome")

## Testing

- **Unit Tests**: Located in `test/` directory (e.g., `test/domainUtils.test.ts`)
- **Shell Scripts**: Several `.sh` files in root for manual testing:
  - `quick-test.sh`: Quick functionality test
  - `test-hosts.sh`: Tests hosts file access
  - `test_immediate_blocking.sh`: Verifies immediate blocking effectiveness

## File Structure

```
src/
├── storage.ts                        # LocalStorage interface (BlockedDomain, BlockingStatus)
├── domainUtils.ts                    # Domain validation/sanitization
├── streamlinedHostsManager.ts        # Main blocking orchestrator
├── passwordManager.ts                # Auth session caching (singleton, legacy)
├── biometricAuth.ts                  # Touch ID/Face ID authentication with fallback
├── statusVerifier.ts                 # Verifies actual blocking status from hosts file
├── browserRefresher.ts               # Tab closing/refreshing via AppleScript
├── browserCacheClearer.ts            # DNS & browser cache clearing
├── safeEnhancedHostsManager.ts       # Alternative blocking implementation
├── add-website.tsx                   # "Add Website to Block" command
├── streamlined-enable-blocking.tsx   # "Enable Website Blocking" command
├── streamlined-disable-blocking.tsx  # "Disable Website Blocking" command
├── view-blocked-sites.tsx            # "Manage Blocked Sites" command
└── refresh-blocking.tsx              # "Force Re-Block & Fix" command
```

## Development Tips

1. **After code changes**: Run `npm run build` and reload extension in Raycast (⌘+R in Raycast)
2. **Debugging**: Use `console.log()` - view logs in Raycast Developer Console (⌘+Shift+D)
3. **Testing blocking**: Add a domain, enable blocking, verify hosts file has entries with `# WebBlocker` tag
4. **Testing DNS**: Use `dscacheutil -q host -a name example.com` to verify DNS resolution
5. **Hosts file location**: `/etc/hosts` - requires sudo to modify
6. **AppleScript testing**: Test scripts in Script Editor.app before integrating

## Troubleshooting Common Issues

- **"Browser tabs still accessible"**: Run the "Force Re-Block & Fix" command which closes tabs and re-applies blocking
- **"Status shows inactive but blocking is working"**: This issue has been fixed! The extension now verifies status directly from the hosts file
- **"Touch ID not appearing"**: Check that your Mac has Touch ID enabled. The system will automatically fall back to password if Touch ID is unavailable
- **"Blocking doesn't take effect immediately"**: Ensure tab closing and cache clearing happen BEFORE authentication prompt
- **TypeScript errors after changes**: Run `npm run clean && npm run build` to clear stale artifacts
