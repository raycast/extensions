# About
A simple extension that generate DuckDuckGo email alias.

# Pre requisites
You need to have an DuckDuckGo email, see https://duckduckgo.com/email/

# Getting auth token
1. Download DuckDuckGo extension, it is only needed during setup
2. Go to https://duckduckgo.com/email
3. Open Dev Tools to and go to network tab
4. Clear all network requests
5. Click "Generate Private Duck Address"
6. Open the first request, see image below
<img width="973" alt="image" src="https://github.com/Hugo-Persson/raycast-duckduckgo-email/assets/47189713/d50f101f-b56d-4ce3-ab47-6fb1d5be5c66">
7. Look at the header "Authorization", copy the value after "Bearer", this is your token
