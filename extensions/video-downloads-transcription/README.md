# Video Downloads & Transcription

Save YouTube subtitles in any available language as RAW text, clean text, SRT or VTT, for one video or a whole playlist or channel. Download audio or video from YouTube, Instagram, X, TikTok and [hundreds of other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md). Transcribe or translate videos without subtitles, or any audio or video file on your Mac, with [whisper.cpp](https://github.com/ggml-org/whisper.cpp). Hold a hotkey to dictate locally into any app.

- **Copy a link, open the command.** A YouTube, Instagram or X link in your clipboard loads right away, with no extra steps. With no link in the clipboard, the video open in your browser loads instead.
- **See what you're downloading.** The video's thumbnail and title appear as soon as the link is recognized.
- **Every subtitle track.** Creator subtitles and YouTube's automatic captions are all listed.
- **Whole playlists and channels.** Subtitles, MP3, M4A or MP4 for every video, with videos already downloaded skipped.
- **Your languages first.** Favorite languages are listed at the top, and `serbian`, `Serbian` and `serbian (orig)` all match the same language.
- **Audio and video from most sites.** Save MP3, M4A or MP4 in the best available quality, including every video in an X post or Instagram carousel.
- **Photos from Instagram and X.** Save every photo in a post at full resolution.
- **Transcribe your own files.** Select recordings or folders in Finder, pick the language, output and model, and press ⌘↵.
- **Hold to talk anywhere.** Hold a hotkey, speak while the floating waveform follows your voice, then release to insert locally transcribed text at the cursor without removing what is already there.
- **Keeps running when Raycast closes.** Audio and video downloads, playlist downloads and transcriptions run in a background queue, with progress in the menu bar and a Cancel action.
- **No invented text in silence.** Silero voice activity detection skips silence and music, which stops whisper from repeating made-up lines.
- **Local transcription.** Audio is never uploaded to a transcription service.

## Setup

Open **Manage Tools and Models**. It shows which tools are installed and installs missing ones with [Homebrew](https://brew.sh).

| Tool                                                   | Needed for                                          |
| ------------------------------------------------------ | --------------------------------------------------- |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp)             | All downloads                                       |
| [ffmpeg](https://ffmpeg.org)                           | MP3, M4A, MP4, subtitle conversion, transcription   |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Transcription only, with a [model](#whisper-models) |

Select a missing tool and press ↵ to install it, or press ⌘K and choose **Install All Missing Tools**. Installs run in the [queue](#the-queue), so you can close Raycast while Homebrew works. Without Homebrew, the list links to its website and copies its install command for Terminal.

You can also install everything in Terminal:

```sh
brew install yt-dlp ffmpeg whisper.cpp
```

The extension finds tools in your `PATH`, `/opt/homebrew/bin`, `/usr/local/bin`, and a whisper.cpp checkout at `~/GitHub/whisper.cpp`. If yours are elsewhere, set their paths in the extension preferences.

## Commands

| Command                       | What it does                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Download Video**            | Subtitles, audio and video for a YouTube video, playlist or channel, audio and video from other sites, or a pasted file path |
| **Transcribe Selected Files** | Transcribes the files or folders selected in Finder                                                                          |
| **Dictate**                   | Records while its hotkey is held, then inserts the local transcription at the cursor                                         |
| **Configure Dictation**       | Chooses the dictation model, microphone, spoken language and bubble position                                                 |
| **Manage Tools and Models**   | Installs yt-dlp, ffmpeg and whisper.cpp, and downloads whisper models                                                        |
| **Queue**                     | Running, queued and finished downloads and transcriptions, with Cancel and results                                           |
| **Queue in Menu Bar**         | Shows progress in the menu bar while the queue is running                                                                    |

## How to use it

1. Copy a YouTube link.
2. Open **Download Video**. The link is placed in the search bar and the video starts loading.
3. Check the thumbnail and title in the side panel.
4. Choose a subtitle format from the dropdown (⌘P). **RAW** is selected by default.
5. Select a language and press ↵.

Files are saved to `~/Downloads` unless you choose another folder in the preferences.

Already opened the command? Paste a link with ⌘V and it loads immediately, replacing the current video.

### From your browser

Watching a video in your browser? Open **Download Video** from the browser and the video in the current tab loads, with no need to copy its link. A video link in your clipboard always comes first; the browser tab is used only when the clipboard has none, and only when you open the command while a browser is the frontmost app.

This works in Safari, Chrome, Arc, Brave, Edge, Vivaldi, Opera, Dia and other Chromium browsers. The first time, macOS asks to let Raycast control the browser; the extension only reads the address of the current tab. Firefox and Zen need the [Raycast browser extension](https://www.raycast.com/browser-extension). Turn this off with **Browser Tab** in the preferences.

| Key  | Action                                                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| ↵    | Download the selected language in the chosen format, or the selected audio/video format                     |
| ⌘⇧C  | Download the selected language and copy its text to the clipboard                                           |
| ⌘P   | Choose the subtitle format                                                                                  |
| ⌘K   | More actions: other subtitle formats, Cancel Download, Show Queue, Edit Favorite Languages, and preferences |
| Type | Filter the list, for example `english` or `mp3`                                                             |
| ⌘V   | Paste a video link and load it, or paste a file or folder path to transcribe it                             |
| Esc  | Clear the search bar; press again to close                                                                  |

### Supported links

- **Videos:** YouTube `watch`, `youtu.be`, Shorts, Live and embed links, including `m.youtube.com` and `music.youtube.com`, with or without `https://`.
- **Playlists:** `youtube.com/playlist?list=…`. A video link that includes `&list=…` loads the video and also offers the whole playlist.
- **Channels:** `youtube.com/@name`, `/channel/…`, `/c/…` and `/user/…`, optionally with `/videos`, `/shorts` or `/streams`.
- **Other video sites:** posts, reels and videos from Instagram, X (Twitter), TikTok, Facebook, Threads, Bluesky, Reddit, Twitch, Kick, Bilibili, Vimeo, Dailymotion, SoundCloud, Bandcamp and other popular sites load as soon as you paste them, like YouTube links. Profile and home pages don't.

Links typed by hand, and links to any other site [supported by yt-dlp](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md), show **Search This Link**. Press ↵ to load them.

## Dictation

**Dictate** is a local hold-to-talk command inspired by the familiar press, speak and release workflow. It records from your microphone while its hotkey is held, transcribes the completed utterance after you release it, and inserts the result at the active cursor. Existing text stays in place; if text is selected, its plain text is kept and the dictation is added after it.

### Set it up

1. Install ffmpeg and whisper.cpp, then download a model in **Manage Tools and Models**.
2. Open **Configure Dictation**. Choose a model, **System Default** or a connected microphone, and a spoken language or **Detect Automatically**. The dictation model is separate from the model used for files and downloaded videos. Choose a corner, edge or center for the bubble; **Bottom Right** is the default. Horizontal and vertical offsets adjust its position in screen points: positive values move right and down, and negative values move left and up.
3. Open Raycast Settings → Extensions, select **Dictate**, and record a hotkey.

Opening **Dictate** with Return instead of a held hotkey shows a setup prompt. Choose **Open Command Settings** to assign or change its shortcut without starting the microphone.

To use Caps Lock as a Super button, open Raycast Settings → Keyboard → Hyper Key and set it to **Caps Lock**. Then assign a Hyper shortcut such as Hyper-D to **Dictate**. It can sit alongside existing Caps Lock-J, K, L or arrow shortcuts.

### Use it

1. Put the cursor where the text should appear.
2. Press and keep holding the **Dictate** hotkey. Start speaking when the floating bubble appears. Its shape keeps morphing even in silence and moves noticeably faster and a little more strongly while you speak. The bubble grows slightly with your voice and returns to its original size when you stop speaking.
3. Release the hotkey. The bubble switches to a processing pulse while the full utterance is transcribed, then closes when the text is inserted. Press Escape while recording to cancel instead.

`large-v3-turbo` is a good balance of accuracy and speed. With **Voice Activity Detection** on, as it is by default, Silero VAD removes silence before whisper processes the recording. Recording, voice detection and transcription all happen on your Mac, and the temporary recording is removed afterward.

## Subtitles

| Format        | File        | What you get                                                                                                                                                           |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RAW · TXT** | `- RAW.txt` | Original caption text without timestamps. Automatic captions use YouTube's transcript data when available to avoid scrolling repeats while keeping spoken repetitions. |
| **Clean TXT** | `.txt`      | Readable plain text with overlapping cue text removed.                                                                                                                 |
| **SRT**       | `.srt`      | Timed subtitles for video players and editors. Empty cues are removed and the rest renumbered.                                                                         |
| **VTT**       | `.vtt`      | Timed WebVTT subtitles as YouTube provides them.                                                                                                                       |

Rows marked **Creator** are subtitles uploaded by the channel. Rows marked **Automatic** are YouTube's speech recognition. **(Original)** marks automatic captions in the video's spoken language.

Files are named `Video Title [videoId] - language.srt`, with `- auto` for automatic captions and `- RAW` for RAW exports. If a file with the same name exists, a number is added.

When an automatic caption only provides timed subtitles, RAW keeps every cue as supplied, so scrolling repeats can remain. Choose **Clean TXT** to remove them.

To paste a subtitle somewhere right away, press ⌘⇧C instead of ↵: the file is saved and its text copied to the clipboard. After a normal download, the toast offers **Copy Text**, and ⌘K offers **Copy Last Subtitle**.

Press ⌘K and choose **Cancel Download** to stop a download. The progress toast has a Cancel button too.

### Favorite languages

Press ⌘K, choose **Edit Favorite Languages**, and enter names or codes separated by commas, for example `Serbian, English, de`. Matching ignores capitalization and `(orig)`, so `serbian`, `Serbian` and `serbian (orig)` all find Serbian. Matches appear in **Favorite Languages** at the top, in the order you wrote them. If nothing matches exactly, the closest languages appear in **Suggested Languages**.

### Playlists and channels

Paste a playlist or channel link into **Download Video**. The list shows **Download Subtitles for N Videos**, **Download MP3**, **M4A** and **MP4 for N Videos**, and every video in it; press ↵ on a video to open it on its own.

Press ↵ on **Download MP3 for N Videos**, or M4A or MP4, to add the whole playlist to the queue. Every video is saved as its own file in a folder named after the playlist or channel, inside your download folder. For more than 20 videos, the extension asks first. Videos that can't be downloaded, such as members-only videos or streams that haven't ended, are skipped and listed in the queue. Videos that already have a file in that format in the folder are not downloaded again.

Press ↵ on **Download Subtitles for N Videos** and choose:

- **Language:** your favorite languages come first.
- **Subtitles:** **Creator subtitles, or automatic captions** (the default) uses the creator's subtitles and falls back to YouTube's automatic captions in the spoken language. **Creator subtitles only** skips videos without them. **Also YouTube's automatic translations** adds machine-translated captions, which download more slowly because YouTube limits how many you can get at once.
- **Format:** RAW, Clean TXT, SRT or VTT.

Press ⌘↵ to add the download to the queue. Each video's subtitles are saved in a folder named after the playlist or channel, inside your download folder. Videos without subtitles in that language are skipped and listed in the queue. Videos that already have a file in that folder are not downloaded again, so you can run the same download later to pick up new videos, or continue one you canceled.

## Audio and video

| Format  | Quality                                                    |
| ------- | ---------------------------------------------------------- |
| **MP3** | Best available audio, converted at the highest MP3 quality |
| **M4A** | Best available audio, saved as M4A                         |
| **MP4** | Best available video with audio, saved as MP4              |

Press ↵ to add the download to the [queue](#the-queue), so it keeps going when you close Raycast. Progress is shown on the row and in the menu bar, and up to three downloads run at once. Press ↵ on a row that is downloading to cancel it.

Files are named `Video Title [videoId].mp3`, `.m4a` or `.mp4`.

### Instagram, X and other sites

Audio and video downloads work the same way on every site yt-dlp supports: paste the link, check the thumbnail and title, and press ↵ on MP3, M4A or MP4. On X the title is the post's text, and on Instagram it's "Video by" and the account name.

- **Posts with several videos**, such as X posts and Instagram carousels, save every video as its own file: `Title [postId] 1.mp4`, `Title [postId] 2.mp4`. The row shows how many videos the post has.
- **Photos** in Instagram and X posts appear under **Photos**. Press ↵ on **Download 4 Photos** to save each one at full resolution, as `Title [postId] 1.jpg` and so on. Posts with only photos show just that row.
- **Posts without video or photos**, such as a text-only X post, say so instead of downloading.
- **Videos without sound** download as MP4; MP3 and M4A say the video has no audio.
- **Live streams** can be downloaded after they end.
- **Sign-in:** Instagram shows many posts only to signed-in accounts, and X sometimes limits downloads without an account. Turn on [Browser Sign-In](#browser-sign-in) with the browser you use those sites in.

Only YouTube has subtitle tracks. For other sites the list offers **Transcribe with Whisper** instead. For posts with several videos, every video is transcribed and saved as its own file: `Title [postId] 1 - whisper-Serbian.txt`, `Title [postId] 2 - whisper-Serbian.txt`.

## Transcribe audio and video files

### From Finder

1. Select audio or video files, or folders, in Finder.
2. Open **Transcribe Selected Files**. The selection is already filled in.
3. Check the **Spoken Language**, **Output** and **Model**, then press ⌘↵.

Folders are searched, including subfolders, for audio and video files. If nothing is selected, or Finder wasn't the frontmost app when you opened Raycast, choose files or folders in the form instead.

Assign the command a hotkey or alias in Raycast settings to transcribe the selection with a single shortcut.

### From Download Video

Paste the full path of an audio or video file or a folder into the search bar, for example `/Users/you/Recordings/interview.m4a`. To copy a path in Finder, select the file and press ⌥⌘C. Paths starting with `~/`, paths in quotes, and paths with backslash-escaped spaces copied from Terminal also work. The same form opens.

If you type a path instead of pasting it, the file appears as a row. Press ↵ to open the form, or ⌘↵ to transcribe right away with the language and model shown in the side panel.

### The form

- **Spoken Language:** your favorite languages come first, with the best match selected. All languages supported by whisper.cpp are listed below them, along with **Detect Automatically**. Type to search the list.
- **Output:** **RAW · TXT**, **Clean TXT**, **SRT** or **VTT**. RAW is selected by default.
- **Model:** the whisper models found next to your default model. `large-v3-turbo` is fast and accurate; `large-v3` is the most accurate and slowest; quantized models such as `large-v3-turbo-q5_0` are smaller and faster, and slightly less accurate. See [Whisper models](#whisper-models).
- **Translate to English:** whisper writes an English translation instead of the spoken language. Turbo models were not trained to translate and answer in the spoken language, so choose `large-v3` or `medium` for translation.

Press ⌘↵ to add the files to the queue. The extension converts the audio with ffmpeg to the 16 kHz mono WAV whisper.cpp needs, reading only the first audio track, and transcribes it. WAV files that are already 16 kHz mono 16-bit are not converted at all.

Each result is saved next to its original file as `interview - whisper-Serbian.srt`, `interview - whisper-Serbian - RAW.txt` for RAW, or `interview - whisper-Serbian to English.srt` for a translation. If that folder is not writable, it goes to the download folder instead.

## The queue

Audio and video downloads, playlist downloads and transcriptions run in a background process, so they keep going when you close Raycast. Transcriptions run one at a time, and so do playlist downloads. Up to three audio and video downloads run beside them.

- **Queue** lists running, queued and finished jobs. Cancel a running or queued job with ⌃X. For finished jobs you can open the result, show it in Finder, copy a transcript, try again, or clear the list.
- **Queue in Menu Bar** shows the progress of the running job, for example `42% +2`, and hides itself when the queue is empty. Hold ⌥ to cancel a running job. Jobs that finished in the last 15 minutes stay in the menu, where you can copy a transcript, open the result or show it in Finder.
- When a transcription finishes while Raycast is open, the toast offers **Copy Transcript**.
- When the queue finishes, a macOS notification sums up what was saved. Turn this off with **Notifications** in the preferences.

A transcription that was running when your Mac shut down shows **Stopped before finishing**; choose **Try Again**.

## Transcribe videos without subtitles

If a video has no creator subtitles and no automatic captions, the list shows **Transcribe with Whisper**. Press ↵ to choose the language, output and model, or ⌘↵ to transcribe right away in the language shown and the format selected with ⌘P. The audio is downloaded to a temporary folder and transcribed in the queue, and the result is saved to the download folder as `Video Title [videoId] - whisper-Serbian.srt`.

## Voice activity detection

Whisper tends to invent text when it hears silence or music. A common result is the same line repeated for the whole recording, such as "Hvala što pratite kanal." With **Voice Activity Detection** on (the default), [Silero VAD](https://github.com/snakers4/silero-vad) finds the parts with speech first, and whisper transcribes only those. It is also faster: a 10-minute recording with long pauses takes about 15 seconds with `large-v3-turbo` on an M3.

The first transcription downloads `ggml-silero-v6.2.0.bin` (885 KB) from the [whisper.cpp VAD models](https://huggingface.co/ggml-org/whisper-vad) and checks its checksum. To use your own copy, put it next to your whisper model or select it under **Silero VAD Model**. VAD needs a recent whisper.cpp.

## Whisper models

Transcription needs whisper.cpp and at least one model. Models aren't included with the extension because they're large.

In **Manage Tools and Models**, select a model under **Whisper Models** and press ↵ to download it from [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp). The download runs in the queue with progress in the menu bar, and is checked against its published checksum. If your Mac goes offline or restarts, **Try Again** continues where it stopped.

| Model                                        | Size           | Notes                                                |
| -------------------------------------------- | -------------- | ---------------------------------------------------- |
| `large-v3-turbo`                             | 1.6 GB         | Recommended: fast and nearly as accurate as large-v3 |
| `large-v3-turbo-q8_0`, `large-v3-turbo-q5_0` | 874 MB, 574 MB | Smaller turbo models                                 |
| `large-v3`                                   | 3.1 GB         | Most accurate and slowest; can translate             |
| `large-v3-q5_0`                              | 1.1 GB         | Smaller large-v3; can translate                      |
| `medium`, `medium-q5_0`                      | 1.5 GB, 539 MB | Faster and less accurate; can translate              |
| `small`, `base`                              | 488 MB, 148 MB | Fastest, for clear speech                            |

- **The default model** is selected in the transcription form and used when you transcribe right away with ⌘↵. It is `large-v3-turbo` when you have it; choose another with **Set as Default Model**. The **Default Whisper Model** preference overrides it.
- **The Model dropdown** lists the models downloaded here, the models in `~/GitHub/whisper.cpp/models`, and the models next to the **Default Whisper Model** preference.
- **Models downloaded here** are saved in the extension's support folder. **Move Model to Trash** removes one; models you added yourself are never removed.

To build whisper.cpp from source instead of installing it with Homebrew:

```sh
git clone https://github.com/ggml-org/whisper.cpp.git ~/GitHub/whisper.cpp
cd ~/GitHub/whisper.cpp
cmake -B build
cmake --build build --config Release
```

A checkout at `~/GitHub/whisper.cpp` is found automatically, along with the models in its `models` folder. For a checkout elsewhere, set **whisper.cpp CLI** to its `build/bin/whisper-cli`.

### Core ML

If you built whisper.cpp with Core ML (`-DWHISPER_COREML=1`), each model also needs its Core ML encoder next to it, such as `ggml-large-v3-encoder.mlmodelc`. Quantized models use the encoder of their base model.

**Manage Tools and Models** marks models without one **Needs Core ML encoder**. Choose **Download Core ML Encoder** to download the prebuilt encoder from Hugging Face and unpack it next to the model. You don't have to do this first: when you transcribe with such a model, its encoder is downloaded before the transcription starts, and the **Model** dropdown says so. The first transcription with a new encoder takes longer while macOS prepares it for your Mac.

Encoders can be downloaded for `large-v3-turbo`, `large-v3`, `medium`, `small` and `base`, and their quantized models. Other models need a build without Core ML, or an encoder you create with `./models/generate-coreml-model.sh` in whisper.cpp.

## Preferences

| Preference                     | Default             | Description                                                                                                         |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Download Folder**            | `~/Downloads`       | Where subtitles, audio, video and YouTube transcriptions are saved. File transcriptions are saved next to the file. |
| **yt-dlp Executable**          | Found automatically | Path to `yt-dlp`                                                                                                    |
| **ffmpeg Executable**          | Found automatically | Path to `ffmpeg`                                                                                                    |
| **Browser Sign-In**            | Off                 | The browser whose sign-in yt-dlp uses, for restricted YouTube videos and posts that need an account on other sites  |
| **Browser Tab**                | On                  | Load the video open in the frontmost browser tab when the clipboard has no video link                               |
| **whisper.cpp CLI**            | Found automatically | Path to `whisper-cli`                                                                                               |
| **Default Whisper Model**      | Chosen in the list  | Overrides the default model chosen in Manage Tools and Models. Other models in its folder can be chosen too.        |
| **Voice Activity Detection**   | On                  | Transcribe only the parts with speech, using Silero VAD                                                             |
| **Silero VAD Model**           | Downloaded          | Path to a Silero VAD model for whisper.cpp                                                                          |
| **Notifications**              | On                  | Show a notification when everything in the queue is done                                                            |
| **Transcription Language**     | `Serbian`           | Spoken language to select when no favorite language matches                                                         |
| **Favorite Caption Languages** | `Serbian`           | Starting value for favorite languages, until you edit them with ⌘K                                                  |

### Browser sign-in

Some videos only play when you're signed in: age-restricted, private and members-only YouTube videos, videos YouTube wants to confirm you're not a bot for, and many Instagram posts. X also limits downloads without an account at times. Choose **Firefox** or **Safari** under **Browser Sign-In**, and yt-dlp reads that browser's cookies on your Mac. Sign in to the download site in that browser first.

- **Safari:** macOS protects Safari's cookies. Give Raycast Full Disk Access in System Settings → Privacy & Security → Full Disk Access.
- **Firefox:** works without extra permissions.

Chromium browsers aren't supported for Browser Sign-In because reading their cookies requires Keychain access. Previously saved Chromium choices are treated as Browser Sign-In being off. The extension ignores yt-dlp configuration files so they cannot enable a different browser.

## Troubleshooting

**"yt-dlp was not found" or "ffmpeg was not found".** Install them in **Manage Tools and Models**, or set their paths in the preferences.

**"No whisper model is installed".** Download one in **Manage Tools and Models**. See [Whisper models](#whisper-models).

**A video won't load or download.** YouTube changes often, and old yt-dlp versions stop working. When a newer yt-dlp is available, **Download Video** says so and offers **Update yt-dlp**. It runs `brew upgrade yt-dlp`, `pipx upgrade yt-dlp`, `pip install --upgrade yt-dlp` or `yt-dlp -U`, depending on how yt-dlp was installed. The newest version is checked on GitHub at most twice a day.

**"This video is age-restricted", "only for channel members", or "Instagram only shows this to signed-in accounts".** Turn on [Browser Sign-In](#browser-sign-in).

**"X is limiting downloads without an account".** Try again in a moment, or turn on [Browser Sign-In](#browser-sign-in) with the browser you use X in.

**"No speech was found".** The recording has only music, sound effects or silence, so there is nothing to transcribe.

**Dictate asks for a hotkey.** Choose **Open Command Settings** in the prompt and assign a shortcut. Opening **Dictate** with Return never starts the microphone; hold its shortcut to record.

**Dictate cannot use the microphone.** Allow Raycast under System Settings → Privacy & Security → Microphone. To use another input, select it in **Configure Dictation**; **System Default** follows the input selected in System Settings → Sound → Input.

**Dictate keeps listening after the hotkey is released.** Hotkey release detection is best effort. Press Escape to cancel, then try a shortcut with a modifier or a Caps Lock Hyper Key and keep it held until the floating waveform appears.

**"HTTP Error 429" on automatic captions.** YouTube is rate limiting requests, which happens most with automatic translations. The extension retries once after 60 seconds. If it still fails, wait a few minutes, or use a creator track or the original-language track.

**The transcript repeats one line, or has text where nobody speaks.** Make sure **Voice Activity Detection** is on.

**"needs Core ML encoder" or "couldn't load the Core ML encoder".** See [Core ML](#core-ml). If a downloaded encoder is damaged, move it to the Trash and transcribe again to download it again.

**"large-v3-turbo can't translate".** Choose `large-v3`, `medium` or another model without "turbo" in its name.

**Transcribe Selected Files doesn't show my selection.** Raycast can only read the selection when Finder is the frontmost app. Click the Finder window, then open the command.

**No notification when the queue finishes.** Notifications come from Script Editor. Allow them in System Settings → Notifications → Script Editor.

**A job says "Stopped before finishing".** The background process was stopped, for example by a restart. Choose **Try Again** in **Queue**.

## Privacy

Everything runs on your Mac. The extension talks only to:

- YouTube, or the site a link is from, for video details, thumbnails, subtitles, audio and video.
- X's embed service (`cdn.syndication.twimg.com`), for the photos in X posts.
- GitHub, to check the newest yt-dlp version at most twice a day.
- Hugging Face, to download the Silero VAD model once, and the whisper models and Core ML encoders you choose.
- Homebrew, when you install tools with it.

With **Browser Tab** on, the extension reads the address of your browser's current tab when you open **Download Video** from the browser and uses it to load video details from that site.

Recordings and transcripts stay on your computer. Dictation recordings are temporary and removed after local transcription. With Browser Sign-In on, yt-dlp reads your browser's cookies locally and sends the cookies needed to the site you're downloading from.

## Development

Use Node.js 22.22.2 or newer.

```sh
npm install
npm run dev    # load the extension in Raycast
npm test
npm run lint
```

`npm run publish` opens a pull request to the Raycast Store. The `author` field in `package.json` must be your Raycast Store username.
