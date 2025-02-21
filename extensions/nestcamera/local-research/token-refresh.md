Querying Perplexity AI using sonar-pro for: What are the best practices for token refresh strategy in long-running streams, specifically for Google Nest API and OAuth tokens? How to handle token expiration during active video streams?
For long-running streams with Google Nest API and OAuth tokens, here are the best practices for token refresh:

1. Use the OAuth 2.0 authorization code flow with refresh tokens[2][3].

2. Store both the access token and refresh token securely[3].

3. Set reasonable expiration times - 30 minutes for access tokens, 24 hours for refresh tokens as a starting point[4].

4. Implement refresh token rotation, where a new refresh token is issued with each access token refresh[5].

5. Use the refresh token to proactively request a new access token before the current one expires[3][9].

6. Handle 401 Unauthorized errors by refreshing the token and retrying the request[3].

7. For Google Nest specifically, implement two endpoints:
   - Authorization endpoint for initial sign-in
   - Token exchange endpoint for exchanging codes and refresh tokens[6]

8. Use Google's client libraries which handle token refresh automatically[8].

To handle token expiration during active video streams:

1. Monitor the token expiration time and refresh before it expires[9].

2. Use connection keep-alive and reconnect options in streaming clients:

```
ffmpeg -multiple_requests 1 -reconnect 1 -reconnect_at_eof 1 -reconnect_streamed 1 -reconnect_delay_max 2 -i http://url.m3u8
```

3. Implement seamless token refresh in the background without interrupting the stream[1].

4. If using HLS, update the m3u8 playlist with new token URLs as tokens are refreshed[7].

5. Consider using a proxy server to handle token refresh and URL updates transparently to clients[7].