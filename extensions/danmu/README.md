# Danmu

Scraping danmu from [dandan play](https://api.dandanplay.net/swagger/ui/index#/).

This extension automatically searches for danmu based on the video file selected in Finder and downloads it to the same directory. The danmu files are saved in ASS format. If there are embedded Chinese subtitles in the current directory or within the video, the extension will extract the subtitles and additionally create an ASS file that contains both danmu and subtitles.

The file matching rules are as follows:
- First, the hash value is calculated based on the content of the first 16 MB of the file for an exact match.
- If the first 16 MB cannot be matched, it will attempt to match the file name. If there is a corresponding NFO file in the current directory, it will extract the title to assist in matching.
- If neither of the above methods works, the user will be prompted to select the file manually.