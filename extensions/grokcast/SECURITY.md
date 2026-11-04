# Security

Report a vulnerability through GitHub private vulnerability reporting on [SolZeroAI/grokcast](https://github.com/SolZeroAI/grokcast). Please do not open a public issue for a token leak or a way to send a token to another host.

Grokcast keeps xAI OAuth tokens in Raycast's encrypted token store on the user's Mac. It sends them only to `x.ai` hosts. **Sign Out** in **Grok Account** revokes the refresh token at xAI and deletes the local copy. A user can also revoke access from their xAI account settings.
