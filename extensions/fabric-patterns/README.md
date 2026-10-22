# Fabric Patterns

Run [fabric](https://github.com/danielmiessler/fabric) from [Raycast](https://www.raycast.com). Fabric is a tool that sends your text to an AI with a ready-made set of instructions, and hands back the answer. This extension lets you do that with a few keys instead of typing in the Terminal.

Raycast is a free Mac launcher you open with a keyboard shortcut. This extension needs fabric installed on your Mac; it does not include it. macOS only.

**New to fabric or the Terminal?** The guide [Fabric, Step by Step](https://michaelhixon.com/guides/fabric/) is the full walkthrough. It shows every step below with real output, and each lesson shows the Terminal way and the Raycast way side by side.

## Words used here

- **Pattern:** a saved set of instructions for one job, like `summarize` or "fix my writing". Fabric ships a few hundred. See [lesson 2](https://michaelhixon.com/guides/fabric/first-runs/#inside).

- **Model:** the AI that writes the answer.

- **Vendor:** the company or app that runs the model, like Anthropic or Ollama. See [lesson 8](https://michaelhixon.com/guides/fabric/models/).

- **API key:** a secret code that lets fabric use an AI company's service, billed per use. It is separate from a chat subscription. See [Install](https://michaelhixon.com/guides/fabric/install/#install).

- **Raycast command:** one of the four entries below. Open Raycast and type its name, like **Run Fabric Pattern**.

- **Keys:** ⌘ is the Command key, ⇧ is Shift, and ↵ is Return. ⌘K opens a screen's full list of actions.

- **Run form:** Raycast's full form for a run, opened with ⌘↵ on a pattern. See [lesson 4](https://michaelhixon.com/guides/fabric/everyday/#email).

- **Context:** a note about you that fabric adds to the pattern's instructions. See [lesson 7](https://michaelhixon.com/guides/fabric/more-control/#context).

- **Session:** a named conversation fabric remembers. Later questions in it can see what came before. See [lesson 7b](https://michaelhixon.com/guides/fabric/more-control/#sessions).

- **Strategy:** a way of thinking added to a pattern, like step by step. See [lesson 8b](https://michaelhixon.com/guides/fabric/models/#thinking).

- **Config:** a saved set of model settings (model and its vendor, temperature and Top P, two dials for how varied the answer is) that you make in Manage Fabric and pick in the run form. Temperature is a creativity dial. Lesson 8b uses one to fix a [thinking error](https://michaelhixon.com/guides/fabric/models/#thinking).

- **Chain:** patterns run one after another, each one working on the last one's answer. Fabric calls it a workflow. See [lesson 9b](https://michaelhixon.com/guides/fabric/build-your-own/#chains).

- **Custom Patterns:** the folder for patterns you write yourself, set in fabric's setup. See [lesson 9](https://michaelhixon.com/guides/fabric/build-your-own/#own).

The guide's [word list](https://michaelhixon.com/guides/fabric/reference/#words) has the rest.

## Install

These are the steps from the guide's [Install page](https://michaelhixon.com/guides/fabric/install/), in the same order. You do this once. Already have fabric? Skip to step 5.

The Terminal is an app where you type commands instead of clicking. Type a line, press Return, and the answer prints below it. The guide's [warm-up](https://michaelhixon.com/guides/fabric/#terminal) explains the basics.

1. **Check for Homebrew.** [Homebrew](https://brew.sh) is the usual way to add command-line tools to a Mac. If this prints a version, you have it:

   ```sh
   brew --version
   ```

   If it says `command not found`, install Homebrew first. [brew.sh](https://brew.sh) gives you one line to paste into the Terminal. It asks for your Mac password. Nothing shows while you type it; that is normal. When it finishes, read the **Next steps** it prints. On a Mac with an M1 chip or later, it gives you two or three lines to run so the Terminal can find `brew`. Run each one, then close the Terminal window, open a new one, and run `brew --version` again.

2. **Install fabric.** Homebrew calls it `fabric-ai`:

   ```sh
   brew install fabric-ai
   ```

   For YouTube videos, also install `yt-dlp`, the tool fabric uses to fetch a video's transcript:

   ```sh
   brew install yt-dlp
   ```

   Watch the name: `brew install fabric`, without `-ai`, installs a different program, an SSH tool that has nothing to do with this one.

3. **Give it its short name.** Homebrew names the command `fabric-ai`, but the guide and fabric's own docs type `fabric`. This line makes `fabric` work too. It prints nothing when it works:

   ```sh
   ln -s "$(brew --prefix)/bin/fabric-ai" "$(brew --prefix)/bin/fabric"
   ```

   If it says `File exists`, something called `fabric` is already there. Run the check below. A version number means you are done. Anything else means a different program already uses that name; run `ls -l "$(brew --prefix)/bin/fabric"` to see what it is before you change anything.

   ```sh
   fabric --version
   ```

4. **Set it up once.** Fabric needs an **API key**: a long secret code that lets fabric use an AI company's service. The company bills you for each use. It is separate from a ChatGPT or Claude chat subscription. Make one on the company's developer site (for example [console.anthropic.com](https://console.anthropic.com) or [platform.openai.com](https://platform.openai.com)) and add a few dollars of prepaid credit there. Keep it secret, like a password: never paste it into a chat, an email or a screenshot.

   ```sh
   fabric --setup
   ```

   Setup shows a numbered list of things you can set. Type a number and press Return to open one. To leave setup, press Return on an empty line (or press Control-C). The ones that matter now:

   - Your AI company (the **vendor**). Paste your key when it asks. Press Return to skip any question you don't understand.

   - **Default AI Vendor and Model**, the model fabric uses every day. Not sure which? Pick the company's mid-size current model.

   - **Custom Patterns**, under Tools: the folder for patterns you write yourself. Set it now or later, before you make your own.

   You can run setup again any time to change them. To check that your key works, send one tiny question. It calls the AI, so it costs a very small amount. You should get a short reply. An error that mentions a key or "unauthorized" means the key was pasted wrong; run `fabric --setup` again.

   ```sh
   echo 'Say hi in three words' | fabric -p raw_query
   ```

5. **Install Raycast and this extension.** Get [Raycast](https://www.raycast.com) and open it. Type `Store`, search for **Fabric Patterns** and press Install. It finds Homebrew's fabric by itself. To check it, open Raycast and type **Run Fabric Pattern**. You should see a list of patterns, with a preview of the selected one on the right.

**Other ways to install.** Fabric can also be installed without Homebrew: with an installer script, a download, or Go. See [fabric's installation guide](https://github.com/danielmiessler/fabric#installation). If you go that way, set the extension's **Fabric Path** setting to where fabric ended up.

### Privacy and cost

- Whatever you send goes to the AI company you picked during setup. Never send passwords, private files or anything you wouldn't email to a stranger.

- Each run costs a little money, billed to that company's account. Long pages and long videos cost more, because more text goes to the AI.

- Web links also go to Jina AI, an outside service fabric uses to turn a page into text. See [lesson 5](https://michaelhixon.com/guides/fabric/web-and-video/).

- A model you run on your own Mac with [Ollama](https://ollama.com) costs nothing per run, after a one-time setup. It is weaker. See [lesson 8](https://michaelhixon.com/guides/fabric/models/).

### What some inputs need

- **YouTube:** `yt-dlp`, from step 2. YouTube comments also need their own key, set in `fabric --setup`.

- **Audio and video files:** an OpenAI key, because fabric uses OpenAI to turn speech into text. Files over 25 MB also need `ffmpeg`, which fabric uses to cut them into smaller pieces: `brew install ffmpeg`.

## Commands

- **Run Fabric Pattern**: find a pattern, chain or session and run it. The list shows your most-used patterns at the top, with the selected pattern's instructions on the right.
  - ↵ runs it on what you've selected: the file selected in Finder, else the selected text, else the clipboard. A single link in the selection or clipboard is fetched as a web page, not sent as text. A pattern or chain that needs {{variables}} opens the run form instead, to ask for them.
  - ⌘↵ opens the run form. Type or paste a link or text into **URL or Text**, or choose a file under **Or a File** (text, image, audio or video; a file wins over the text). Tick **Show Advanced Options** for Config, Strategy, Context, Session, Vendor, Model, [Thinking](https://michaelhixon.com/guides/fabric/models/#thinking) and [Web Search](https://michaelhixon.com/guides/fabric/models/#search). In the form, ⌘↵ runs it, and ⇧⌘D shows the prompt fabric would send without running it. That preview calls no AI, so it is free.

- **Manage Fabric**: create, edit and organize your own patterns, strategies, contexts, sessions, configs and chains, and read the built-in patterns. Pick a kind in the dropdown. ⌘N makes a new one. ⌘D on a built-in pattern makes a copy in your Custom Patterns folder, ready to edit.

- **Update Fabric Patterns**: download the newest built-in patterns (the same as `fabric -U` in the Terminal). Type its name in Raycast and press ↵. It shows "Fabric patterns updated" when done. If it fails, a message says why, and offers a fix when there is one. Manage Fabric's ⌘K menu has the same action.

- **Show Background Runs**: see runs started in the background, copy or paste a finished answer, or stop a run.

Web page, YouTube, audio and video runs go to the background by default, so they keep going if you close Raycast. A notification tells you when one finishes. A background run saves its answer to the Save Folder instead of copying it. A run kept in Raycast stops if you leave its answer screen (Esc, or Raycast closing) before it's done, and a notification says so.

The extension's macOS notifications (a background run's "Done" or "Failed", and "Copied, not pasted") are sent through a small built-in macOS helper, which macOS lists as Script Editor. If they never show up, allow notifications in System Settings › Notifications › Script Editor, and check that no Focus mode is hiding them. Either way, a finished background run is still in Show Background Runs, and an answer that couldn't be pasted is on the clipboard.

On a finished answer:

- ↵ copies it to the clipboard.

- ⌘↵ pastes it into the app you were in before Raycast.

- ⌘S saves it to the Save Folder. ⇧⌘S asks for a name and a folder.

- ⇧⌘C copies the fabric command and options that made this answer. If the run used selected text or the clipboard, that text is not in the command: copy the text, then type `pbpaste |` before the command in the Terminal.

- ⌘K shows every choice, including **Pin Model…**, which makes that pattern always use one model.

The guide's [cheat sheet](https://michaelhixon.com/guides/fabric/reference/#cheat) puts each fabric command next to its Raycast keys.

## Settings

Raycast calls these Preferences.

- **Fabric Path**: the fabric program to run. Defaults to `/opt/homebrew/bin/fabric-ai`, where Homebrew puts it on an M1 Mac or later. Left at that default on an Intel Mac, the extension also finds `/usr/local/bin/fabric-ai`. If fabric lives anywhere else, type its full path here.

- **When a Run Finishes**: copy to the clipboard (the default), paste into the current app, save to a file, or copy and save. The run form can change it for one run.

- **Save Folder**: where saved answers and background-run answers go. Defaults to `~/Documents/Fabric`.

- **Long Runs (Web Pages, YouTube, Audio, Video)**: run them in the background (the default), or keep Raycast open.

- **Custom Patterns Folder**: fabric's Custom Patterns folder. It must match fabric's own setting (`fabric --setup` › Custom Patterns).

## Where it keeps things

- Your patterns, strategies, contexts and sessions live where fabric keeps them, so fabric in the Terminal sees the same ones.

- Configs, chains and background-run records live in the extension's own folder, `~/Library/Application Support/com.raycast.macos/extensions/fabric-patterns/`. Back that folder up to keep them.

## What it won't touch

- It never reads fabric's `.env` file, where your API keys live.

- It never writes into fabric's built-in patterns folder. Your own patterns go to the Custom Patterns Folder.

- It never overwrites a saved answer; a name that's taken gets a `-2`.

- Background-run records are removed once they're over 7 days old, the next time you open Show Background Runs. Answers saved to your Save Folder are kept.

## Development

The rest of this page is for people changing the extension's code.

- Install the dependencies with `npm ci`. The Raycast Store installs this way, so the lockfile is npm's.

- Run the tests with `bun test` (or `bun run test`). One test runs `npm ci --dry-run`, so npm must be on your PATH.

- Tests that run the real fabric are opt-in, since fabric reads its own `.env`: `FABRIC_REAL=1 bun test`, with fabric at `/opt/homebrew/bin/fabric`.

- Check types with `bun run typecheck` and lint with `bun run lint`.

- Run the extension in Raycast while you edit with `bun run dev` (`ray develop`), and build it with `bun run build` (`ray build`).

`ISC-NN` tags in test names and comments are internal requirement IDs.

## License

MIT. See [LICENSE](LICENSE).
