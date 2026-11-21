# Google and YouTube Search Results

Read Google results in Raycast and open only the links you need.

## Search Google

Enter a query in **Search Google**. To search by country and language, set **Country** and **Language** (for example, `us` and `en`). Select a result to read its snippet and see its URL and rank, when available.

- Open a source, copy its URL, or copy a single snippet.
- Choose **Copy Results as Markdown** to paste the whole list into your notes, or **Copy Results as JSON** for the raw response.
- Filter the list as you type. Choose **Edit Search** to change the query or fetch another page.

## More Google searches

Choose **Search Google Images** for thumbnails and image URLs, **Search Google News** for headlines and publishers, or **Search Google Shopping** for merchant prices. **Search Google Videos** finds video pages across sites. **Find Places on Google** lists businesses, addresses, and available ratings. For example, enter `coffee near Union Square` to compare places, or `mechanical keyboard` to compare shopping listings.

## YouTube

- **Search YouTube Videos** finds up to 20 matches. **Search YouTube Videos in Bulk** requests up to 700 at the extended rate. Actual counts vary. **Find YouTube Search Suggestions** takes a partial phrase and returns autocomplete suggestions, not search volumes.
- **Browse YouTube Channel** takes a handle such as `@YouTube` and lists recent uploads. **Inspect YouTube Video Details** takes a video link or ID and returns its description and available chapters.
- **Get YouTube Transcript** reads an existing automatic track. **Get YouTube Uploader Captions** reads an uploaded track in the selected language. Both show timestamps and let you copy individual lines or full text. Neither transcribes or translates missing captions.
- **Check YouTube License Label** reports the detected label, not permission to reuse the video or train a model.
- **Deliver YouTube Media to Cloud Storage** sends an MP4 video or M4A audio track to a destination you control. Choose a private [storage JSON configuration](https://flashdata.dev/docs/sources/youtube_download?utm_source=raycast&utm_medium=integration&utm_campaign=intent_gtm_2026q4&utm_content=youtube_download-task) with scoped write credentials. On submission those credentials are sent to FlashData. Save the job ID and choose **Check Existing Job**, then **Refresh Status and Receipt**. A pending job is not a delivered file. Cloud delivery is billed by delivered volume; only submit media you may export.

## Set up

Add your own [FlashData](https://flashdata.dev/signup?utm_source=raycast&utm_medium=integration&utm_campaign=intent_gtm_2026q4&utm_content=google_search-task) API key in extension preferences and enable the sources you plan to use. Each submitted search or page uses FlashData Credits. Typing and filtering are free. Raycast Pro is not required.

The extension sends your API key only to FlashData. Image previews may contact thumbnail hosts. If a request times out, check your FlashData query history before submitting it again.

- [FlashData](https://flashdata.dev/?utm_source=raycast&utm_medium=integration&utm_campaign=intent_gtm_2026q4&utm_content=google_search-task)
- [FlashData on GitHub](https://github.com/flashdatadev)
- [API reference](https://flashdata.dev/docs/sources/google_search?utm_source=raycast&utm_medium=integration&utm_campaign=intent_gtm_2026q4&utm_content=google_search-task)
- [Terms of service](https://flashdata.dev/legal/terms?utm_source=raycast&utm_medium=integration&utm_campaign=intent_gtm_2026q4&utm_content=google_search-task)
