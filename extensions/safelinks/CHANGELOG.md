# Safe Links Decoder Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Decode Microsoft Defender Safe Links, Proofpoint URLDefense v1/v2/v3, Google redirects and
  generic percent- or base64-encoded URL parameters
- Show the real destination, the full wrapper chain and risk flags such as punycode, user info,
  IP-literal hosts, plain HTTP, shorteners and tracking parameters
- Decode the selected text, the clipboard, or a link pasted into the form - locally and offline,
  the link is never opened or fetched
- Copy the real link, copy it as Markdown, paste it, or open it deliberately, optionally without
  tracking parameters
