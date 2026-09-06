# Synced playback implementation

User-requested slice supersedes the previous milestone ordering.

1. Preserve server can_group_with, set_members, static membership and leader fields in the domain. Use the active output's reported compatible IDs, never provider-name guesses.
2. Players shows Available Players, Group Players, Offline Players. Enter on an available output keeps selecting it; Enter in Group Players adds that endpoint to the active output. Already linked rows offer removal separately. All excludes offline players.
3. Re-read players before changing membership. Use players/cmd/set_members with additive/removal ID arrays, preserving other members and the saved output. Resolve a parent group explicitly; refuse follower leadership changes. Confirm joining a player already playing or grouped elsewhere. Protect static members from removal.
4. Refresh players and queues after each mutation, including ambiguous failures without retrying mutations. Verify membership before reporting success.
5. Cover compatibility, offline filtering, grouping arguments, stale membership, static members, and queue ownership in tests; run check/build and refresh the Windows development import.

Verified read-only against the configured server's /api-docs/commands.json and /api-docs/schemas.json: set_members takes target_player, player_ids_to_add and player_ids_to_remove. Music Assistant server 2.10.2 source expands can_group_with to actual player IDs and checks SET_MEMBERS on the leader. Grouping can automatically ungroup followers, so this extension guards that case.

Live acoustic synchronization requires a user listening check; no test should claim audible synchronization from a mocked response.
