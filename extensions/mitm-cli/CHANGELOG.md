# MITM Proxy Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Set up MITM Proxy installs mitmproxy and `jq` with Homebrew and reports which dependency is missing
- Ask before trusting the root CA from Proxy Status, not only when starting the proxy
- Recent Flows says when nothing has been captured or the proxy is not running
- Starting the proxy no longer opens the mitmweb UI in the browser
- Toggle a local mitmproxy intercept on and off
- Show process, system proxy, root CA and UI state
- Browse recent captured HTTP/HTTPS flows
- Trust and remove the mitmproxy root CA from the login keychain
