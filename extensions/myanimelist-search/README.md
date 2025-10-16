<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7a/MyAnimeList_Logo.png" height="68">
  <h1 align="center">Myanimelist Search</h1>
</p>

A [Raycast](https://raycast.com/) extension that lets you easily search and open animes on [Myanimelist](http://myanimelist.net/).

![Example of Myanimelist Search Extension on Raycast](https://user-images.githubusercontent.com/9930144/193858767-c441cad0-a207-4479-9b96-b4c6b2347b7e.png)

Choose between 3 views in the settings:

- list (simple): results listed with minimal information
- list (detailed): have a sidebar with additional details
- grid: results displayed as cards, with big image.

![Example of Myanimelist Search Extension on Raycast](https://user-images.githubusercontent.com/9930144/193862635-088d5e44-cf4a-4517-8c72-eece9e54fa0b.png)

### Additional details

In the list view, you can toggle between simple and detailed views with the action "Cmd+Enter".
Navigate through the results with the pagination!
When search bar is empty, it will show you the seasonal animes.
NSFW animes are hidden by default but you can toggle their visibility in the settings.

### About the API

This extension uses the unofficial Myanimelist Api [Jikan](https://jikan.moe/).
The datas are not live but parsed and cached every 24 hours. I chose to use this api instead of the official one because it requires API credentials and is slightly better.

### Troubleshooting

Sometimes, if you type too fast, you'll reach the rate limit per seconds and need to wait 1sec to add or remove a letter to the search to work again.

---

No more of having to go to the site and search or typing the name on a search engine. Enjoy!

_This extension is not endorsed by or affiliated with Myanimelist._
