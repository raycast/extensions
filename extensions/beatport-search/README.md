# Beatport Search

Find a track, identify a remix, or browse an artist’s indexed Top Ten from Raycast. Open **Search Beatport** on macOS and type at least two characters. No account or API key is required. This is an independent extension. Beatport does not develop or endorse it.

## Find a specific mix

Try **Walls DJ Tennis Remix Art Department**. **Matching Mixes** shows tracks whose indexed title, version and artist credits match. **Possible Matches** contains titles inferred from links with unconfirmed credits. **Related Tracks** can include other versions or artists.

Press Return to open a track on Beatport. To share it, open Actions and choose **Copy Track URL**. The list shows up to ten tracks. If titles and credits are identical, look for the release date, label or Beatport track ID.

## Browse an artist

Try **Trashlagoon**. An exact artist match puts the profile first. If several artists share the name, choose the profile by artist ID or a track you recognize.

**Beatport Top Ten** preserves the rank numbers available in the search index. When fewer than ten ranks appear, choose **View Full Top Ten on Beatport** for the current chart. You can also select the artist and choose **Open Top Ten on Beatport** in Actions. A magnifier marks a rank that still needs a track lookup. Choose **Find This Mix** to search with its title and credits, then press Escape to return. If more results arrive while a row is selected, its Return action stays the same. On a selected rank, open Actions for a newly verified track link. If a second artist with the same name appears while the first profile is selected, choose **View Artist Top Ten** in Actions.

## Search service and privacy

The extension sends your query to [Exa](https://exa.ai/mcp) after you pause typing. It can send follow-up searches for a specific mix, an artist profile or the first three unresolved chart positions. Raycast loads available track covers and portraits from Beatport’s image CDN. Search results depend on what Exa has indexed. If Exa reaches its free rate limit or a search fails, choose **Retry Search** or press Return to search on Beatport in your browser.
