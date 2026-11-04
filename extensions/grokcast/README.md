# Grokcast

Grokcast lets you use Grok in [Raycast](https://www.raycast.com) and Tinycast with your own Grok or X subscription. You do not need an xAI API key, and nothing is billed separately. The extension is built on xAI's official TypeScript SDK, so it can offer any native Grok feature. Voice comes first: dictation and reading text aloud.

## Status

| Feature                                          | State |
| ------------------------------------------------ | ----- |
| Sign in and sign out with your Grok subscription | Done  |
| Microphone recorder                              | Done  |
| Dictate (record, then transcribe)                | Done  |
| Live dictation with partial text                 | Done  |
| Read selected text aloud                         | Done  |
| Generate and edit images                         | Done  |
| Generate, edit, and extend videos                | Built |
| Grok Chat with web and X search                  | Done  |
| Ask Grok about images in a chat                  | Done  |
| Grok Models and Count Tokens                     | Done  |
| Grok Files                                       | Done  |
| Grok Voices and custom voices                    | Done  |

## Microphone

Grokcast records with a small Swift helper that ships inside the extension, so you do not need to install anything. The first time it records, macOS asks to let Raycast (or Tinycast) use the microphone. Audio is not saved.

## Dictation

**Dictate** listens until you press Return and shows the text while you speak. Then it pastes the text into the app you were using. Press Esc to cancel. Recording stops on its own after 5 minutes.

When it's done, a HUD sums up the dictation, and the side panel shows the words, length, speaking speed, language, how long the text took after you stopped, and whether it came live or from the whole recording. Press ⌘Y to open **Dictation History**, which shows the same details for each dictation.

The live text comes from xAI's streaming speech-to-text, with your subscription. If the live connection stops, Dictate keeps recording and sends the whole recording to xAI when you stop, so you still get your text.

Set these in the extension preferences:

- **Dictation Language**: the language you speak, or Detect Automatically.
- **Formatting**: write numbers, currencies, and units as digits. This needs a dictation language. Live text always writes them as digits when a language is set; this setting applies when the whole recording is sent.
- **After Dictation**: paste into the frontmost app, or only copy to the clipboard.
- **History**: keep the text of your last 100 dictations on this Mac. **Dictation History** lets you search, paste, copy, or delete them. Audio is never saved.

## Read Aloud

**Read Aloud** reads the selected text aloud in a Grok voice. When nothing is selected, it reads the clipboard. You can also type the text into its argument. The speech plays in the background, so you can keep working. Run **Read Aloud** again to stop it. Assign a hotkey to make this one keystroke.

Grok reads up to 60,000 characters at a time. Speech is made by xAI's text-to-speech with your subscription. The audio is kept only until the next run replaces it.

Set these in the command preferences:

- **Voice**: one of Grok's voices, or xAI Default.
- **Speed**: from 0.7× to 1.5×, or xAI Default.
- **Reading Language**: the language of the text, or Detect Automatically.

## Images

**Generate Image** asks for a prompt and makes up to four images with Grok Imagine on your subscription. Pick an aspect ratio and resolution, or leave them at xAI Default. **Edit Image** changes up to three JPEG, PNG, or WebP images with a prompt. It starts with the images selected in Finder, if there are any. With more than one image, call them `<IMAGE_0>`, `<IMAGE_1>`, and so on in the prompt.

Each new image shows in a grid. Copy or paste it, look at it with Quick Look (⌘Y), save it to Downloads (⌘S), edit it again (⌘E), or reuse the prompt (⇧⌘R). **Image History** keeps your last 200 images in the extension's support folder on this Mac, with the same actions. Grokcast does not choose the image model, so xAI's current default and its upgrades apply.

## Video

**Generate Video** makes a short video with Grok Imagine, with your subscription. Write a prompt, or choose a picture to use as the first frame. You can also edit an MP4 (say what to change) or extend one (say what happens next).

Length, aspect ratio, and resolution start at **xAI Default**. Grokcast never picks the model, so xAI's current video model and its upgrades apply. A video usually takes a minute or two. Keep the command open while it works: the side panel shows xAI's progress. If it takes more than 10 minutes, **Check Again** looks up the same job instead of starting a new one.

When the video is ready, **Open Video** plays it in your browser, and ⌘S saves the MP4 to your Downloads folder. xAI's link is temporary, so save the videos you want to keep.

## Chat

**Grok Chat** answers questions with Grok and keeps the conversation going. Type a question in the search bar and press Return. The answer streams into the side panel, with its sources, the model that answered, and what Grok's tools did. Ask a follow-up the same way. Press ⌘N for a new conversation and ⌘Y to see your saved conversations. Grokcast keeps the last 50 conversations on this Mac.

To ask about an image, attach it first: select it in Finder and press ⌘⇧F, copy it and press ⌘⇧V, or press ⌘⇧I to choose files. Grok reads JPEG, PNG, and WebP images up to 20 MB. A conversation keeps the image's location, not a copy, so follow-ups send the image again while the file is still there.

Set these in the command preferences:

- **Model**: leave empty to use grok-4.7. Enter another model ID from Grok Models to use that model instead.
- **Reasoning**: how hard Grok thinks before it answers. Lower is faster. Not every model accepts a setting.
- **Grok Tools**: let Grok search the web, search X, or run Python in xAI's sandbox. Web and X search are on by default.
- **Instructions**: text sent with every question, such as "Answer briefly".

## Models

**Grok Models** lists the Grok language, image, and video models that xAI offers your account, newest first. The side panel shows each model's version, aliases, inputs and outputs, context length, and reasoning efforts. Grokcast does not show prices, because your subscription does not pay per token. Other commands do not pin a model, so xAI's default and its upgrades apply on their own.

On a language model, **Count Tokens** (⌘T) shows how that model splits a text into tokens and how many there are.

## Files

**Grok Files** lists the files you keep at xAI, newest first. The side panel shows each file's size, upload date, expiry, purpose, and public link.

- **Upload File** (⌘N) picks a file on this Mac and uploads it. Choose whether xAI deletes it after 1 hour, 1 day, 7 days, or 30 days, or keeps it until you delete it.
- **Download** saves the file in your Downloads folder. It never replaces a file there: it adds " (1)", " (2)", and so on to the name.
- **Create Public Link** (⌘L) makes a link anyone can open to download the file, and copies it. Choose how long it works. **Revoke Public Link** stops it.
- **Delete File** (⌃X) deletes the file at xAI.

The list shows up to the newest 500 files.

## Voices

**Grok Voices** lists your custom voices and Grok's built-in voices. The side panel shows each voice's ID, language, gender, and the other labels xAI keeps.

- **Preview Voice** reads a short sentence in that voice, with your Read Aloud speed and language. ⌘. stops it.
- **Use for Read Aloud** (⌘U) makes Read Aloud use that voice instead of its Voice preference. This is how Read Aloud gets a custom voice. **Stop Using for Read Aloud** goes back to the preference.
- **Record a New Voice** (⌘N) records up to 2 minutes of your voice, then makes a custom voice from it at xAI. **New Voice from Audio File** (⌘⇧N) does the same from a clip you already have. Only use your own voice, or one you have permission to use.
- **Edit Voice** (⌘E) changes a custom voice's name and labels. **Delete Voice** (⌃X) deletes it at xAI.

## How sign-in works

**Grok Account** shows who is signed in. **Sign In** starts the xAI device-code sign-in. It copies a short code to your clipboard and opens `accounts.x.ai` in your browser. Approve the code there and the command finishes on its own. **Sign Out** revokes the sign-in at xAI and removes it from this Mac.

The tokens stay in Raycast's encrypted token store on your Mac. Grokcast has no server. Requests go straight to `api.x.ai` and count against your subscription's weekly usage.

xAI does not yet offer client registration for third-party apps. Grokcast reuses Grok Build's public OAuth client, the same way Hermes Agent, OpenCode, and others do. If xAI gives this extension its own client ID, set it in the extension preferences.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).
