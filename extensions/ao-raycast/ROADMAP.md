# ROADMAP

This document outlines the commands and features implemented in this Raycast extension that integrates with the AR.IO SDK, as well as known issues and future enhancements.

## Implemented Commands and Features

### 1. ArNS Records Command (`src/Arns.tsx`)
- [x] **Fetching ArNS Records**: Utilizes the AR.IO SDK (via `ARIO.init()`) to fetch real-time ArNS records.
- [x] **Undernames View**: Displays detailed information for undernames using the `UndernamesView` component.
- [x] **Caching and Pagination**: Implements caching using `LocalStorage` and supports pagination for large datasets.
- [x] **Search and Filtering**: Enables filtering records in real-time based on search input.
- [x] **Routing URLs**: Uses `getRoutableUrl` and `getBestGateway` from `src/utils/ao.ts` to generate accessible URLs.
- [x] **Polyfill for Fetch**: Integrates the `cross-fetch/polyfill` to ensure network request compatibility.

### 2. View Transaction (ViewTx) Command (`src/ViewTx.tsx`)
- [x] **Transaction Viewing**: Allows users to input an Arweave transaction ID and view details.
- [x] **Opening in Browser**: Provides actions to open the transaction in external services such as ao.link and through a data URL.
- [x] **Clipboard Integration**: Supports pasting transaction IDs from the clipboard.
- [x] **Polyfill for Fetch**: Uses `cross-fetch/polyfill` for consistent network behavior.

## Known Issues and Future Enhancements

- [ ] **ViewTx Data Link Issue**: The "View Transaction" command currently cannot open the data link associated with the transaction. This needs further investigation and resolution.
- [ ] **Incorrect Icon in ViewTx**: The icon displayed at the bottom of the View Transaction form is not correct. This requires a fix for the UI.
- [ ] **Enhanced Error Handling**: Improve error handling in network requests and AR.IO SDK interactions.
- [ ] **Performance Monitoring**: Further optimize the performance metrics and caching mechanism in the ArNS command.
- [ ] **Additional Functionality**: Consider adding more AR.IO integration features and commands based on user feedback.

## Additional Notes

- This extension relies on Bun as the package manager.
- The code follows best practices for Raycast extensions and uses the AR.IO SDK for blockchain interactions. 