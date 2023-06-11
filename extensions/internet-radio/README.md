# Internet Radio

Play live internet radio through Music, QuickTime Player, VLC, or Vox. The 36 default stations cover a wide variety of genres, including live news, and you can add custom stations by providing a directly link to the stream URL (e.g. a live broadcast mp3, ogg, acc, pls, or other audio file). You can also view the current station and control playback via a menu bar extra.

Note: When adding URLs, they must be URLs that Music.app can play. For a lot of streams, including many on TuneIn, you can find a direct url to an audio file by observing the network tab in your browser’s inspector.

## Commands

- Search Stations
    - Search a database of 1500+ radio stations, optionally playing them or saving them for later
- Browse Saved Stations
    - Browse the list of saved stations, and edit or delete stations, and control playback.
- New Station
    - Add a custom station via a simple form.
- Stop Playback
    - Stops the currently playing station and removes the associated stream file from Music.app.
- Play Last Station
    - Resumes playback of the last played station.
- Toggle Play/Pause
    - Toggle playback of the current station.
- Play Random Station
    - Plays a random live radio station.
- Menu Bar Radio
    - View current station and control playback from the menu bar.
- Current Station
    - Shows the currently playing station.
- Export Saved Stations
    - Export all of your saved stations to a JSON file.
- Import Station Data
    - Restore stations into your saved stations list from a JSON file.

## Details

Internet Radio comes pre-configured with 25 saved stations spanning a variety of genres. You can immediately start listening to any of those stations, or you can start looking to add others. Feel free to delete some or all of the defaults!

To add new stations, you can either use the built-in `Search Stations` command to search a dataset of known radio stations, or you can manually input a station using the `New Station` command.

With the `Search Stations` command, you can find stations from all over the globe streaming almost any genre. The dataset that the extension pulls from can be found [here](https://github.com/SKaplanOfficial/internet-radio/blob/main/radio-stations.json). If you have a station not listed there, please considering adding it!

For the `New Station` command, you will need to provide a direct stream link playable by Music.app. For a lot of streams, including many on TuneIn, you can find a direct url to an audio file by observing the network tab in your browser’s inspector. Often, such URLs will be extension-less, e.g. "http://uk1.internet-radio.com:8355/stream," or to an MP3 or AAC file (but there are exceptions). __At the moment, Internet Radio does not support HLS formats (i.e. m3u8).__

For help finding internet radio stations and their stream URLs, take a look at my [List of Internet Radio Station Directory Sites](https://github.com/SKaplanOfficial/internet-radio/blob/main/README.md).

## Exported Station Sets

You can use the import and export capabilities of the extension to share sets of radio stations, or to quickly load many stations that you're interested in. Here are some station sets to get you started:

- [Classical Music Stations](https://gist.github.com/SKaplanOfficial/ff7b8dd2c877f8aaee2e3e3c8d49a0f9)
- [Hawaiian Music Stations](https://gist.github.com/SKaplanOfficial/40b689444fe2362902ed220a76f9066b)
- [Movie Soundtrack Stations](https://raw.githubusercontent.com/SKaplanOfficial/internet-radio/main/station-sets/genre-soundtracks.json)