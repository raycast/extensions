# Architecture Recommendation

## File Structure

```typescript
src/
├── timeline.tsx           # Main timeline command
├── create-post.tsx        # Create post command
├── notifications.tsx      # Notifications command
├── search.tsx             # Search command
├── profile.tsx            # Profile command
├── preferences.ts         # Extension preferences
├── actions/
│   ├── like-post.ts       # Like/unlike post action
│   ├── repost.ts          # Repost action
│   ├── reply.ts           # Reply to post action
│   ├── delete-post.ts     # Delete post action
│   └── follow-user.ts     # Follow/unfollow user action
├── api/
│   ├── client.ts          # Your Threads API client
│   ├── endpoints.ts       # API endpoint definitions
│   └── types.ts           # API-specific types
├── components/
│   ├── PostItem.tsx       # Reusable post component
│   ├── UserItem.tsx       # Reusable user component
│   ├── EmptyView.tsx      # Empty states
│   └── ErrorView.tsx      # Error states
├── hooks/
│   ├── useTimeline.ts     # Timeline data fetching
│   ├── useAuth.ts         # Auth state management
│   └── usePost.ts         # Post actions
├── types/
│   ├── index.ts           # Shared type exports
│   ├── post.ts            # Post-related types
│   ├── user.ts            # User-related types
│   └── preferences.ts     # Preference types
└── utils/
    ├── oauth.ts           # OAuth helpers
    ├── cache.ts           # Cache management
    ├── format.ts          # Formatting utilities
    └── constants.ts       # App constants
```
