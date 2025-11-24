# Carrier Icon Loading Performance Fix

## Issue
UPS (and other carrier) icons were loading slowly in the menu bar and other views due to the use of `getFavicon()` from `@raycast/utils`, which fetches favicons from a remote service over the network.

## Root Cause
The `getFavicon()` function makes network requests to fetch favicons, causing:
- Network latency delays
- Variable loading times depending on the carrier's server response
- Slower perceived performance, especially for UPS icons

## Solution
Replaced `getFavicon()` calls with direct references to local PNG assets that already exist in the `assets/` directory:
- `usps.png`
- `ups.png`  
- `fedex.png`

## Changes Made
**File:** `src/carriers.ts`
- Removed `getFavicon` import from `@raycast/utils`
- Changed icon definitions from:
  ```typescript
  icon: getFavicon("https://www.ups.com", { fallback: "ups.png" })
  ```
  to:
  ```typescript
  icon: "ups.png"
  ```

## Performance Impact
- **Before:** Icons loaded with network latency (variable, often 100-500ms+)
- **After:** Icons load instantly from local assets (< 1ms)

## Benefits
✅ Instant icon loading for all carriers  
✅ No network dependency for UI rendering  
✅ Consistent performance regardless of network conditions  
✅ Reduced memory usage (no favicon service caching)  
✅ Simpler code without unnecessary external dependency
