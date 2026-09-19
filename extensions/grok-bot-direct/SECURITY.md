# Security and privacy

This is an unofficial client. It is not affiliated with or endorsed by xAI,
SpaceXAI, Cursor, or Raycast. It uses the Grok Bot desktop protocol observed in
version 0.43.0, including an existing Cursor browser login flow; it is not an
independently registered OAuth application. The browser confirmation names Grok
Bot. Public API compatibility and Store acceptance are not guaranteed.

## Data handling

- Passwords and multi-factor authentication remain in the provider's browser flow.
- Access and refresh tokens use Raycast's OAuth token storage. The extension does
  not read credentials from other applications or invoke Keychain command-line tools.
- Backend tokens go to `api2.cursor.sh`. Gateway credentials go to the HTTPS
  endpoint returned by that backend. Redirects are rejected for authenticated calls.
- Conversations and loaded thread caches remain in memory. Cache invalidation
  discards in-flight results after account reset.
- Attachments are uploaded only when submitted through the composer. Downloads
  use the authenticated gateway, are stored with owner-only permissions, and are
  revealed in Finder rather than executed.
- No analytics service, independent relay server, or public tunnel is included.
- Ambiguous message delivery is not automatically retried. Approval and routine
  operations reread the relevant request/instructions before submission.

Current provider terms apply. In particular, undocumented integrations and the
desktop authentication mechanism need review before Store acceptance. See the
[Grok Bot terms](https://x.ai/legal/grok-bot-terms),
[acceptable-use policy](https://x.ai/legal/acceptable-use-policy), and
[Raycast extension guidelines](https://manual.raycast.com/extensions-guidelines).
This repository does not claim provider authorization to redistribute a branded
client or use an undocumented API.

## Reporting

Do not include tokens, private conversations, account identifiers, local session
files, or sensitive screenshots in a public issue. Use GitHub's private security
reporting when available; otherwise open a minimal issue requesting a private
contact channel without disclosing the vulnerability or private data.

## Artwork

The release icon is original AI-assisted artwork. Extracted Grok Bot application
artwork is not distributed in this repository. Optional local avatar files belong
to their respective owners and are outside this project's MIT license.
