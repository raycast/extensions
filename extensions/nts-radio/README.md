# NTS Radio

![nts-radio-1](https://user-images.githubusercontent.com/13831998/236661309-eb8f1b52-0e2f-4962-b4f1-c8a3b2e69825.png)


_Music is your only friend, until the end_

Search and access [NTS Radio](https://www.nts.live) shows, episodes, and live streams directly from Raycast! This is an unofficial (fan) implementation based on the (undocumented) public NTS Radio API.

This extension allows you to:

- Stream live stations (1 and 2) as well as "Infinite Mixtapes" directly from Raycast.
- Search for shows and episodes (just like you would on nts.live).
- View details of episodes (e.g., broadcast date, location of broadcast).
- Play episodes on NTS.live, Mixcloud, or Soundcloud (depending on where the episode is published).
- View song tracklist (if available).
- Quickly search for tracklist songs on Discogs, Spotify, or Youtube, or copy to clipboard.
- Add episodes to your “My Favourites” section for quick access (independent of favourites saved in your NTS account).
- Access "Latest" twelve published episodes

## FAQ

- Why can’t I play episodes directly in the extension?

NTS episodes are stored on Mixcloud (and often Soundcloud as well). Right now, unfortunately, neither Mixcloud nor Soundcloud allow you to stream tracks via their APIs. Should this change, I’ll be happy to add the functionality.

- Then why can I play/stream the live stations and infinite mixtapes?

Live stations and mixtapes are audio streams hosted by NTS and can be accessed by any client software using the respective stream URL. This extension uses macOS' QuickTime Player to play streams (please make sure to have it installed if you want to use this feature).

- Why can’t I just use my favourites list from my NTS account?

This extension is an unofficial implementation and thus cannot access any NTS user account information. If your favourites list is not too long, it should be relatively quick to add it manually using Raycast.

## Screenshots

![nts-radio-2](https://user-images.githubusercontent.com/13831998/236661328-8acbb585-58a9-4418-bc2e-0c832e407129.png)

![nts-radio-3](https://user-images.githubusercontent.com/13831998/236661330-64632fa0-e2aa-4ab4-8925-4720ac41c518.png)

![nts-radio-4](https://user-images.githubusercontent.com/13831998/236661337-d06cefeb-9b06-47bf-9fb2-ee7fac2e4199.png)

![nts-radio-5](https://user-images.githubusercontent.com/13831998/236661341-3da24e94-b5da-4bd6-a7ae-a931e892ded7.png)
