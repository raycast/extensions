# ✅ MVP Features

1. OAuth authentication flow (using Raycast's built-in OAuth)
2. View timeline/feed (your "For You" feed)
3. Create simple text posts
4. View your profile stats
5. Basic error handling & loading states

**Why this order?**

- Auth is required for everything else
- Viewing content is lower risk than posting (users want to see it works first)
- Simple posting gets users engaged
- Profile stats give immediate value

## **Phase 2: Engagement Features (Week 3-4)** 💬

*Goal: Enable users to interact with content*

✅ Interaction Features:

1. Like posts (⌘+L)
2. Reply to posts (⌘+R)  
3. Repost/Quote post (⌘+⇧+R)
4. View post details (replies, likes count)
5. Copy post link
6. Open post in browser

**Bluesky pattern to follow:**

- Use `ActionPanel` with keyboard shortcuts
- Show actions contextually based on post type
- Implement optimistic updates (show action immediately, sync in background)

## **Phase 3: Discovery & Search (Week 5-6)** 🔍

*Goal: Help users find content and people*

✅ Discovery Features:

1. Search posts (keyword search - new API feature!)
2. Search users
3. View user profiles
4. Follow/Unfollow users
5. View trending topics (if API supports)

## **Phase 4: Advanced Posting (Week 7-8)** 📸

*Goal: Rich content creation*

✅ Rich Content:

1. Attach images to posts
2. Attach videos to posts
3. Create carousel posts (up to 20 items - new API!)
4. Add alt-text to media
5. Thread/multi-post support
6. Draft management (use Raycast LocalStorage)

## **Phase 5: Notifications & Monitoring (Week 9-10)** 🔔

*Goal: Keep users informed*

✅ Notification Features:

1. View notifications command
2. Menu bar notifications (unread count)
3. Mention webhooks (if self-hosted)
4. Filter notifications (likes, replies, mentions, reposts)

## **Phase 6: Analytics & Insights (Week 11-12)** 📊

*Goal: Help users understand their presence*

✅ Analytics Features:

1. Post insights (views, likes, replies, reposts, quotes)
2. Profile analytics (followers, engagement rate)
3. Best performing posts
4. Follower demographics (if available)
5. Export data

## **Phase 7: AI & Power Features (Week 13+)** 🤖

*Goal: Differentiate from web app*

✅ AI & Advanced:

1. AI post generation (using Raycast AI)
2. AI reply suggestions
3. Generate alt-text for images
4. Sentiment analysis
5. Schedule posts (LocalStorage + cron)
6. Saved posts collection
7. Custom filters/lists