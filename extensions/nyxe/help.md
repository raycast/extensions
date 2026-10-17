# Setting up your Nyxe API token

Nyxe Mail for Raycast signs in with a personal API token.

1. Open Nyxe at https://nyxe.app and go to **Settings → API tokens**.
2. Click **New token**. The name defaults to "Raycast".
3. Pick what the token may do:
   - **Read mail**: search, inbox, threads, sign-in codes.
   - **Triage**: mark read, archive, snooze, tag.
   - **Send**: send mail and create reply drafts.
4. Pick when it expires (30 days, 90 days or 1 year).
5. Copy the token. It starts with `nyxe_pat_` and is shown only once.
6. In Raycast, open the Nyxe Mail extension preferences and paste it into **API Token**.

If a command says the token isn't working, it has expired or been revoked. Create a new one and paste it in. A password reset revokes every token.

Each token works for one Nyxe workspace. Revoke a token any time from the same settings page.
