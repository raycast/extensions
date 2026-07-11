<!-- Source: https://github.com/mdn/content/blob/5f3cacbf4db23d0656aa3d231b7181ba2fc5743e/files/en-us/web/http/headers/cache-control/index.md -->

Some intermediaries transform content for various reasons. For example, some convert images to reduce transfer size. In some cases, this is undesirable for the content provider.

`no-transform` indicates that any intermediary (regardless of whether it implements a cache) shouldn't transform the response contents.

Note: [Google's Web Light](https://support.google.com/webmasters/answer/6211428) is one kind of such an intermediary. It converts images to minimize data for a cache store or slow connection and supports `no-transform` as an opt-out option.