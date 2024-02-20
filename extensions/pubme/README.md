# PubMe Extension

Search [PubMed](https://pubmed.ncbi.nlm.nih.gov/), a free database maintained by the National Library of Medicine (NLM), with [Raycast](https://www.raycast.com/). If the search entry is empty, 10 Trending Articles (from [https://pubmed.ncbi.nlm.nih.gov/trending/](https://pubmed.ncbi.nlm.nih.gov/trending/)) are displayed and cached. You can set the `refreshInterval` in settings.

Required `NIH API Key` (enter "0", if you do not have one): Without an API key, you can only make 3 requests per second. Unfortunately, when listing multiple items, an additional request is sent for each item, so you may receive the error message "Error 429" (too many requests). It is therefore recommended to set an API key to increase the limit to 10 requests/second. Further information at [https://support.nlm.nih.gov/knowledgebase/article/KA-05317/en-us](https://support.nlm.nih.gov/knowledgebase/article/KA-05317/en-us)

Optional `RetMax`: You can set the maximum number of results to be returned in a query with `RetMax`. The default value is 20, but it can be increased up to 100,000. Be aware that increasing RetMax may result in longer query times and higher resource usage from PubMed. It is recommended to set RetMax to a value that meets your needs without compromising the performance of the API.

While you are browsing with PubMe, a history of your last visited articles is created. By default, the 3 most recently visited articles are displayed on the home page. You can change the `Number of history items on the home page` or turn it off in settings.

Disclaimer: Please note that PubMe is not affiliated with or supported by the NLM or PubMed. The data presented through this extension comes from the PubMed database, which is owned and maintained by NLM.