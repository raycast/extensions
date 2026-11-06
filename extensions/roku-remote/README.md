# Roku Remote for Raycast

Control Roku TVs and streaming players directly on your local network. The remote, dashboard, configurable routines, and supported English instructions are free local features. They need no Roam installation, Roku account, companion app, API key, or AI subscription.

This extension uses Roku's ECP interface for local-network control. Roku's documentation contains a restriction concerning third-party platforms; no Roku endorsement, permission, or exception is represented.

## Highlights

- **Keyboard remote** — open *Roku Remote* and just type: `W A S D` / `H J K L` move, `Space` is OK, `Q` is Back, `G` is Home, `P` plays/pauses, `+ −  M` handle volume. Keys go straight to the TV and the search bar clears itself.
- **Live text mode** (`⌘T`) — whatever you type in Raycast appears in the TV's search box as you type. Delete removes characters; `↵` presses Enter.
- **Now playing panel** — the current app (with its real icon), play state and a progress bar refresh every few seconds.
- **One-key app launching** — your home-screen apps and TV inputs show up with their icons right in the remote. The full grid is one `⌘O` away.
- **Search Movies & Shows** — uses Roku's universal search across every installed channel, with an option to open the best match directly.
- **Menu bar** — see what's on and play/pause, change the volume, switch apps or TVs without opening Raycast.
- **Faster** — the TV's identity check is cached for two minutes, so rapid presses cost one request instead of two, and key presses no longer show a toast every time.

## Start using it

Open **Roku Remote** in Raycast. Use **Manage Roku TVs** to discover TVs, then save a TV and choose it as your default. You can also add a TV using the IP address shown under **Roku Settings → Network → About**. Changing the TV in a command's dropdown also changes the default used by quick commands.

On each Roku, set **Settings → System → Advanced system settings → Control by mobile apps → Enabled**. Some models put this option inside **Network access**. Ordinary remote controls do not need Roku Developer Mode.

Your Mac and Roku must be on the same reachable local network. If discovery returns no TVs, try adding the IP address. Guest network isolation and VPN routing can prevent access. If macOS asks for Raycast's local network access, allow it to connect to your TVs.

## Commands

| Raycast command                 | What it does                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Roku Remote                     | Keyboard-driven remote with now playing, quick launch, live text mode, volume and power        |
| Search Movies & Shows on Roku   | Roku universal search across all installed channels; optional argument for instant search      |
| Roku Menu Bar                   | Now playing, playback, volume, app launching and TV switching from the menu bar                |
| Manage Roku TVs                 | Discover, add, rename, remove, refresh and choose the default TV                               |
| Roku TV Dashboard               | Read saved TVs' reachability, power information, network-control mode, and active app or input |
| Roku Routines                   | Create, edit, reorder, and run saved sequences for one TV                                      |
| Roku Instructions               | Preview and run supported English commands or a saved routine name                             |
| Restore Previous Roku Activity  | Return the default TV to its previously recorded app or input                                  |
| Launch Roku App                 | Icon grid of installed apps and TV inputs; open one and check which became active              |
| Type Text on Roku               | Send up to 1,000 characters into an already open TV text field                                 |
| Play/Pause Roku                 | Toggle playback on the default TV                                                              |
| Increase / Decrease Roku Volume | Change volume by one step                                                                      |
| Mute/Unmute Roku                | Toggle mute                                                                                    |
| Go to Roku Home                 | Open the default TV's Home screen                                                              |
| Power on Roku / Power off Roku  | Explicit power commands; waking can also use saved network hardware addresses                  |

Assign Raycast hotkeys or aliases to the quick commands in Raycast Settings → Extensions. Inside the remote, search for a control and press Return. Command-R refreshes TV information or scans for devices in Manage Roku TVs.

Text entry depends on the active Roku app accepting keyboard input. Sending text does not erase existing text or submit the field. Find My Remote appears only when the Roku advertises support. Streaming-player volume and TV power depend on the device's reported HDMI-CEC capabilities.

For reliable wake from standby, enable **Fast TV Start** on compatible Roku TVs. A disconnected or deeply sleeping TV may not respond. A sent wake request is shown separately from a confirmed TV power state. Turning off a TV can also affect connected HDMI devices through CEC.

The dashboard checks status when opened or refreshed; it does not continuously monitor TVs. Opening it sends no controls. Its actions let you open a TV's remote or apps, choose a default, run one of that TV's routines, or restore previous activity. Opening a TV's remote or apps from the dashboard also makes that TV the default.

## Make your own routines

Open **Roku Routines → Build a Custom Routine**, choose a TV, and add steps. **Gaming** and **Movie Night** are editable starting points: choose the actual input or app returned by your TV. They do not assume a particular HDMI port or streaming service.

A routine can contain 1–20 ordered steps:

- Turn the TV on and wait for confirmed power state before continuing.
- Open an installed app or TV input.
- Press a supported remote control, repeated 1–20 times.
- Wait up to 30 seconds.
- Restore the recorded previous app or input.

Review the steps, move them up or down, and save. **Run Routine** starts execution and opens a progress view. A failed step stops later steps; an unconfirmed launch or wake also stops the routine. **Cancel Routine**, or leaving that progress view, stops remaining work. Cancellation does not undo controls already accepted by the TV.

For a shortcut, select a saved routine and choose **Create Quicklink**. The Quicklink runs that routine on its saved TV; it does not use the current default. It uses the routine's latest saved steps. Removing the routine makes its existing Quicklinks stop working. Quicklink runs expose Cancel in their progress toast.

## English instructions, without AI

Open **Roku Instructions**, enter a supported instruction, and choose **Preview Instruction**. Check the resolved TV and actions, including every ordered step of a saved routine, then choose **Run Instruction**. Previewing only reads status and configuration. Running rechecks the plan; changes to aliases, defaults, or routine definitions that alter the plan require a new preview. Standalone restore uses the selected TV's saved previous app or input when that action runs; that destination can change after preview. A routine restores the activity captured before its first app/Home switch; before such a switch it uses saved previous activity at run time.

Examples use saved TV names and apps available on that TV:

| Instruction                                                      | Meaning                                            |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `open YouTube in the kitchen`                                    | Open YouTube on the saved Kitchen TV               |
| `switch Living Room to PS5`                                      | Open the input named PS5 on Living Room            |
| `lower volume three steps on Living Room`                        | Send three volume-down presses                     |
| `toggle mute on Living Room`                                     | Switch its current mute state                      |
| `play/pause on Living Room`                                      | Switch its current playback state                  |
| `run Gaming mode`                                                | Run the saved routine named Gaming mode            |
| `Gaming mode`                                                    | The same exact routine-name shortcut               |
| `restore on Living Room`                                         | Return to that TV's recorded previous app or input |
| `open YouTube in kitchen then lower volume two steps in kitchen` | Preview and run both actions in order              |

Home, Back, navigation, OK, Options, rewind, fast forward, explicit power on/off, and `go back to what was open` are also supported. Volume counts accept digits from 1 to 20 and number words from one to ten. A sentence can contain up to ten actions joined by `then` or `and`; all clauses must resolve before any controls run.

Every clause that omits a TV uses the configured default independently. It does not inherit the TV named in the previous clause. With no default, name a TV explicitly. A saved routine already has its own TV. Unknown or ambiguous TV, app, and routine names are rejected.

This is a fixed local command parser. It does not interpret arbitrary prose, search for a movie, set an exact volume percentage, or generate navigation scripts. Bare `mute`, `unmute`, `play`, and `pause` are rejected because this extension does not verify those current states. Use `toggle mute`, `play/pause`, or `toggle playback` when you intend a toggle. The preview labels the action accordingly. You can cancel remaining actions while an instruction runs.

## Room aliases, app aliases, and protected TVs

In **Roku Instructions**, open the action menu and choose **Edit Room and App Aliases**.

- Under **TV Names and Protection**, give one TV room aliases such as `downstairs` or `kitchen`.
- Under **App and Input Aliases**, choose a TV and one of its real apps or inputs. For example, map `gaming` to PS5 on Living Room, then use `open gaming on downstairs`.
- Mark a TV as requiring an explicit name to prevent English instructions from targeting it implicitly. For example, a protected Bedroom TV requires `on Bedroom`, even when it is the default or belongs to the requested routine.

These settings are structured mappings, not free-form rules. Protection applies to parsed English instructions, including the optional AI tool. It is not a lock on direct remote controls, the routine editor, or a Quicklink that deliberately targets a saved TV.

## Restore previous activity

The extension keeps one previous app or input per TV when its switching controls record an activity change. A routine preserves the activity from before its first actual switch. **Restore Previous Roku Activity**, the dashboard action, or `restore` returns to that recorded target and checks the active-app response. Repeating restore keeps the same target.

This restores an app, input, or Roku Home. It does not restore a film's playback position, text, volume, mute state, or the TV's complete earlier state. Changes made with another remote do not automatically update the saved target. If no previous target is recorded, restore stops with an explanation.

## Optional Raycast AI

The optional AI tools read status, prepare an instruction preview for one saved TV, and execute that saved preview. They use the same supported parser. The preview and control confirmation show every ordered step of a saved routine. The control confirmation refers to the saved plan; execution rechecks it, consumes its preview once, and rejects an expired preview after ten minutes. TV targeting, aliases, and explicit-name protection still apply. Read the displayed action and target before approving a control through Raycast's tool-permission flow.

Raycast currently lists AI Extensions as a paid Pro feature; any subscription or AI usage is separate from this extension. All commands described above work without it. See [Raycast AI Extensions](https://manual.raycast.com/ai/ai-extensions) and [current plans](https://www.raycast.com/pricing).

The free **Roku Instructions** command processes text on your Mac. Using the optional AI tools passes your request and tool results—including serial-derived TV identifiers, TV names, current activity, routines, and alias settings—through Raycast's configured AI experience. Its privacy and permission settings apply; do not treat that flow as the local parser's privacy boundary.

## Install from source

Requires macOS, Raycast, and Node.js 22.22.2 or later.

```sh
npm ci
npm run dev
```

Run those commands in this project folder. Raycast's development command builds and registers the local extension. Once installed, keep the project folder if you want to make further changes.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## How it works

The controller uses Roku's [External Control Protocol](https://developer.roku.com/dev/docs/external-control-api). Discovery sends SSDP `M-SEARCH` packets for `roku:ecp` on each IPv4 network interface. It validates responder addresses, then verifies device information over HTTP port 8060. The remote sends `POST /keypress/<key>`, text uses literal key events, and apps/inputs use `POST /launch/<id>`. It reads device, installed-app and active-app queries for status.

Requests have deadlines, commands are ordered, and failed commands are not automatically retried. Before a control action, the saved serial/identity is checked against the current device at that address. Discovery refreshes saved addresses after DHCP changes. A successful key response means the Roku accepted it; app launches and TV wake additionally attempt state readback.

Saved TVs, aliases, the default TV, wake addresses, routines, instruction settings, and previous-activity targets stay in Raycast's local extension storage. The extension has no analytics backend. ECP itself is unencrypted local-network HTTP. Optional AI behavior is described separately above. The source contains no personal device identifiers or addresses.

The implementation is independently written and does not copy Roam's code.

## Troubleshooting

- **Limited control / HTTP 403:** Change Control by mobile apps to Enabled on that TV. The extension displays the relevant settings path.
- **Address belongs to a different Roku:** Open Manage Roku TVs and discover again. The extension refuses controls until the intended TV is found.
- **TV is unavailable:** Wake it with its physical remote, verify its IP, and refresh. Increase the Connection Timeout preference if needed.
- **Text has no effect:** Open a text field on the TV first. Some apps do not accept ECP text events.
- **Power request sent but unconfirmed:** Check the TV physically. An awake streaming player cannot confirm the power state of a separate connected TV.

Private listening, voice-remote audio, and pairing a physical Roku remote are not implemented. An accepted keypress is a Roku acknowledgement, not proof of its physical effect.

Raycast's [developer setup documentation](https://developers.raycast.com/basics/getting-started) covers the local extension workflow.
