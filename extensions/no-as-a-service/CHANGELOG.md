# No as a Service Changelog

## [Paste Reason and Raycast 2 Update] - 2026-11-10
- Added a "Paste Reason" action that pastes the reason into the frontmost app.
- Show the fetch error once as a toast with a "Retry" action, instead of on every render.
- Show a clear error message instead of "No." when the reason cannot be fetched.
- Show the copy and paste actions only when a reason is available.
- Updated to Raycast API 2.11.

## [Initial Version] - 2026-01-08
- Initial release of the No as a Service extension.
- Added "Random No" command to fetch reasons from the NaaS API.
- Fixed Action icon using built-in Raycast library.
- Updated API endpoint to the stable version.
- Implemented common keyboard shortcuts for better platform support.