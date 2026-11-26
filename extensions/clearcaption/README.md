# ClearCaption YouTube Transcript

Get the transcript of any YouTube video right from Raycast: paste a URL (or copy one before opening the command), read it with timestamps, copy it as plain text, SRT subtitles or timestamped lines. Optional translation to any language keeps the timestamps.

Works where direct YouTube scraping gets blocked: requests run on Apify with rotating proxies.

## Setup

1. Create a free Apify account: https://console.apify.com/sign-up (the free $5 monthly credit covers about 1,000 videos).
2. Copy your API token from https://console.apify.com/settings/integrations and paste it into the extension preferences.

Pricing after the free credit: $0.005 per video with captions, $0 for videos without captions.

Also available as an [npm package](https://github.com/Andrii2203/clearcaption-js), a [Python client](https://github.com/Andrii2203/clearcaption-youtube-transcript) and an [MCP server / no-code actor](https://apify.com/clearcaption/youtube-transcript-translate).
