# Proposed title

Enhance GitHub Review Requests with reply tracking and optional GitHub CLI authentication

# Proposed description

This extends the existing GitHub Review Requests extension with conversation-wide reply tracking, ageing indicators, an activity inbox, and optional notifications. The original search command, GitHub menu-bar icon, review-status categories, recent history, and PAT setup remain available. The attention-focused menu layout and scheduled activity tracking are opt-in.

## Why support GitHub CLI authentication alongside PATs?

Developers at larger organizations may already have a GitHub CLI login authorized for their work repositories. Creating a separate PAT can introduce another credential-authorization process, and organization policy may restrict PATs or require approval. Optional CLI authentication reuses the credential available through `gh auth token`, so users whose CLI access already works can use the extension without creating another token or authorizing a new OAuth application for it.

This does not bypass SSO or organization policy: the CLI credential must have the required repository access, and GitHub CLI may itself need organization approval. The benefit is reusing an existing authorized login. PATs remain fully supported and are the default, so existing users do not need to install `gh` or change their setup.

Both methods use an explicit Authentication Method preference shared by all commands, including the existing search and menu bar. Neither method silently falls back to the other on failure. The README explains when to choose each method, exact setup steps, SSO and token-policy caveats, and read-only verification of a known repository.

## Behavior and compatibility

- Attempts the first menu-bar launch automatically after successful authentication; does not repeatedly override later user choices. Raycast-disabled commands get a settings action.

- Shows the active authentication method in menu-bar and tracking settings, with a shortcut to Raycast’s shared PAT/CLI preference.

- Adds Show in Menu Bar to tracking settings and shared configuration shortcuts to both menu-bar layouts.

- Preserves the existing extension identity, author, command identifiers, PAT/owners preferences, icon asset, and original menu layout; adds `vitoraguila` as a contributor.
- The classic **My Pull Requests** menu continues to use the original pull, refresh, recent-history, and review-status flow. It now uses the shared selected credential, applies the shared organization/personal-owner scope (`user:`), and filters configured ignored authors; the existing Owners preference seeds missing scope configuration, while an explicitly cleared scope searches globally.
- Adds Pull Request Attention, Activity Inbox, Configure Review Tracking, and an optional background watcher. Original commands link to the new views.
- Tracks unresolved inline threads and PR conversations, including review bodies, with ignored authors and direct links to the relevant comment.
- Shows age, inactivity, and the oldest unanswered wait, with optional menu-bar attention grouping.
- Keeps scheduled tracking and desktop notifications off by default; the first activity check establishes a silent baseline.
- Uses the selected credential for original and new requests. Credential changes invalidate cached account data; CLI tokens are not copied into persistent extension storage. Existing organizations, watched repositories, teams, ignored authors, saved filters, and notification settings remain in the shared tracking configuration and continue to feed their corresponding attention categories.
- Adds regression coverage for auth selection/failures, reply tracking, ageing, existing scope initialization, and inbox baseline/persistence behavior.

## Validation status — update before posting

Automated validation passed: 26 regression tests (`npm test`), TypeScript (`npm run typecheck`), Raycast lint (`npm run lint`), and the distribution build (`npm run build`). Checks ran with Node 22.22.2. Read-only GitHub GraphQL checks confirmed personal, organization, and mixed `user:` scopes. Native Raycast rendering, real PAT/SSO access, and manual regression checks remain tracked in LOCAL_VALIDATION.md. No claim of complete manual validation is made yet.

PR #29775 remains a draft until manual validation is complete and it is explicitly marked ready for review.
