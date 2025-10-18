# Threads for Raycast - Development Roadmap

## Phase 1: Core (MVP) ⭐

- [ ] OAuth authentication (Raycast OAuth flow)
  - [ ] Sign in command
  - [ ] Sign out command
  - [ ] Token refresh logic
- [ ] View timeline command
  - [ ] Infinite scroll/pagination
  - [ ] Pull to refresh
  - [ ] Show post metadata (author, time, stats)
- [ ] Create post command
  - [ ] Text-only posts
  - [ ] Character counter
  - [ ] Post preview
- [ ] View profile command
  - [ ] Show user stats (followers, following, posts)
  - [ ] Show recent posts
- [ ] Error handling & loading states

## Phase 2: Interactions

- [ ] Post actions (ActionPanel)
  - [ ] Like/Unlike (⌘+L)
  - [ ] Reply (⌘+R)
  - [ ] Repost (⌘+⇧+R)
  - [ ] Quote post (⌘+Q)
  - [ ] Copy link (⌘+C)
  - [ ] Open in browser (⌘+O)
  - [ ] Share (⌘+S)
- [ ] View post details
  - [ ] Show full thread
  - [ ] Show all replies
  - [ ] Show engagement stats
- [ ] Reply management
  - [ ] View replies to your posts
  - [ ] Hide/unhide replies
  - [ ] Reply controls (who can reply)

## Phase 3: Discovery

- [ ] Search posts command
  - [ ] Keyword search
  - [ ] Filter by date
  - [ ] Filter by engagement
- [ ] Search users command
  - [ ] Search by username
  - [ ] Search by name
  - [ ] View user profile from results
- [ ] User actions
  - [ ] Follow user (⌘+F)
  - [ ] Unfollow user (⌘+⇧+F)
  - [ ] View user's posts
  - [ ] Block/Mute (⌘+B)
- [ ] Topic tags
  - [ ] Browse by topic
  - [ ] Add topics to posts

## Phase 4: Rich Content

- [ ] Image posts
  - [ ] Single image upload
  - [ ] Multi-image carousel (up to 20)
  - [ ] Alt-text editor
  - [ ] Image preview
- [ ] Video posts
  - [ ] Video upload
  - [ ] Video preview
  - [ ] Duration check
- [ ] Link attachments
  - [ ] Separate link field
  - [ ] Auto-fetch link preview
- [ ] Thread creation
  - [ ] Multi-post composer
  - [ ] Thread preview
  - [ ] Auto-numbering
- [ ] Draft management
  - [ ] Save drafts
  - [ ] Load drafts
  - [ ] Delete drafts

## Phase 5: Notifications

- [ ] Notifications command
  - [ ] View all notifications
  - [ ] Filter by type (likes, replies, mentions, follows)
  - [ ] Mark as read
  - [ ] Quick reply from notification
- [ ] Menu bar integration
  - [ ] Show unread count
  - [ ] Quick access menu
  - [ ] Auto-refresh

## Phase 6: Analytics

- [ ] Post insights command
  - [ ] Views, likes, replies, reposts, quotes
  - [ ] Engagement rate
  - [ ] Best time to post
- [ ] Profile analytics
  - [ ] Follower growth
  - [ ] Engagement trends
  - [ ] Top posts
  - [ ] Demographics (if available)
- [ ] Export data
  - [ ] Export to CSV
  - [ ] Export to JSON

## Phase 7: AI Features

- [ ] AI post generation
  - [ ] Generate post from prompt
  - [ ] Multiple variations
  - [ ] Tone selection
- [ ] AI reply suggestions
  - [ ] Context-aware replies
  - [ ] Multiple options
- [ ] AI alt-text generation
  - [ ] Auto-generate from image
  - [ ] Multiple description options
- [ ] Smart scheduling
  - [ ] Optimal time suggestions
  - [ ] Schedule posts
- [ ] Content analysis
  - [ ] Sentiment detection
  - [ ] Engagement prediction

## Phase 8: Power User

- [ ] Saved posts
  - [ ] Save posts for later
  - [ ] Organize with tags
  - [ ] Search saved
- [ ] Custom lists
  - [ ] Create user lists
  - [ ] Filter timeline by list
- [ ] Keyboard maestro
  - [ ] Custom keyboard shortcuts
  - [ ] Quick actions
- [ ] Bulk operations
  - [ ] Bulk delete posts
  - [ ] Bulk unfollow
- [ ] Advanced filters
  - [ ] Filter timeline by keywords
  - [ ] Hide certain content

## Infrastructure

- [X] Centralized logger with verbose toggle
- [ ] Rate limiting handler
- [ ] Offline queue (post later)
- [ ] Cache management
- [ ] Welcome screen
- [ ] Onboarding flow
- [ ] Help documentation
