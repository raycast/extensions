# Implementation TODO: Raycast Store Updates Command

## Completed

- [x] Add TypeScript interfaces for `FeedAuthor`, `FeedItem`, `Feed`
- [x] Add `FEED_URL` constant
- [x] Implement `useFetch` hook for feed data with caching
- [x] Create searchable List view
- [x] Create `ExtensionListItem` component with icon, title, description
- [x] Add accessories: Author (with icon), Time Since Modified
- [x] Create `ExtensionActions` component
- [x] Add "Open in Raycast Store" action with deeplink
- [x] Add "View on Web" action
- [x] Add "View Author Profile" action
- [x] Add "Copy Extension URL" action
- [x] Add empty state handling

## Pending

- [ ] Add New/Updated status detection (needs better mechanism than date heuristic)
- [ ] Add New/Updated tag accessory once detection is available
- [ ] Add filter dropdown for All/New/Updated once detection is available
