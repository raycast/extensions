<div align="center">
    <br/>
    <br/>
    <img src="./media/extension-icon.png" alt="Ghosthand" width="100"/>
    <h3>Ghosthand</h3>
    <p>Control your iPhone and run AI tasks from Raycast</p>
    <br/>
    <br/>
</div>

Ghosthand is a Raycast extension that lets you control a connected iPhone, run AI tasks, capture screenshots, and read on-screen text using your existing [Ghosthand installation](https://ghosthand.dev/).

## Requirements

- macOS 14 or later and Raycast.
- A physical iPhone connected with a USB data cable; simulators are not supported.
- Ghosthand installed, its daemon running, and an account signed in through `ghosthand setup`.
- USB trust, Camera permission, and Bluetooth pairing completed in Ghosthand's setup application. Normal Bluetooth control does not need Developer Mode.

Run `ghosthand setup` in Terminal and follow its instructions. This extension does not install Ghosthand, request macOS permissions, pair devices, or collect account credentials.

## Commands

| Command                 | Use                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Run iPhone Task         | Review and submit a natural-language instruction to Ghosthand's hosted AI agent.                             |
| List iPhones            | See local iPhones, host Mac, iOS version, connection/setup state, and current lease holder.                  |
| View iPhone Screen      | Refresh a read-only preview, copy the image, or explicitly save it to Downloads.                             |
| Read Screen Text        | Read local OCR results in reading order, copy all text or a selected line, or prefill an editable task form. |
| iPhone Quick Actions    | Home, scroll, lock, mute/unmute, type text, tap a visible label, or explicitly press Enter.                  |
| Open Setup Instructions | Open Ghosthand's installation and setup guide.                                                               |

Busy phones remain visible. Previews use the phone's USB ID and do not take, refresh, or release a lease. Control and OCR use the separate capture ID and acquire an exclusive lease with a descriptive reason. Another client's lease is never taken over.

## Raycast AI

Open **Ask Ghosthand** or mention `@ghosthand` in Raycast AI Chat. Four tools support device discovery, hosted tasks, reading screen text, and direct quick actions. For example:

- `@ghosthand list my connected iPhones`
- `@ghosthand open Settings on my iPhone and tell me the appearance setting without changing it`
- `@ghosthand read the text currently visible on my iPhone`
- `@ghosthand type Hello in the focused field without submitting`

The AI selects exact device IDs from the live device list and asks which phone to use when ambiguous. Control and screen-reading tools provide confirmation details, including the selected phone, requested action, and any hosted processing or OCR sharing. Raycast applies your [tool permission settings](https://manual.raycast.com/settings): Auto can approve routine actions automatically, while Ask requests approval for tools that are not already allowed. Although OCR is local, text returned by the AI tool becomes part of your Raycast AI conversation. Device discovery omits account email, phone numbers, and Bluetooth addresses.

Hosted AI tool tasks use the same Ghosthand endpoint and lease cleanup as the native command, with a five-minute deadline. The Raycast tool API does not expose a cancellation signal to this extension; use the **Run iPhone Task** command for streamed progress and an interactive **Stop Task** action. If Raycast terminates the tool process, the usual disconnect and lease-expiry limitations apply. Tools return explicit uncertain outcomes and instruct the AI not to retry automatically.

## Hosted tasks and privacy

Run iPhone Task uses Ghosthand's existing hosted agent. Before the first task, Raycast explains that the prompt, screen context, and device information go to Ghosthand. Every task requires review and confirmation before submission, including approval of any sending, deletion, or purchase requested by the instruction. Tap Text and Press Enter also require confirmation because their effects depend on the focused app.

Previews, OCR, and direct input use the local daemon rather than the hosted agent. Ghosthand itself still checks account/plan eligibility when acquiring a lease. The extension only connects to `~/.ghosthand/daemon.sock`; remote transport and remote phones are not enabled in this release.

Screen previews use private temporary image files so Raycast can render them. Refreshing or disposing the preview view removes its file; Raycast may keep hidden views mounted. Files left by a terminated extension process are removed when a later preview loads. OCR remains in memory unless copied or added to a submitted task.

Copy Screenshot uses a separate private temporary file, copies image bytes into the macOS clipboard, and removes that file afterward. Save Screenshot writes a JPEG to Downloads. Copied content may be retained by your clipboard manager. Apart from these image files and the first-task disclosure acknowledgement, the extension does not persist task prompts, responses, typed text, screenshots, or OCR history. It adds no telemetry or AI backend.

Type Text accepts only printable US-ASCII. Newlines, tabs, and other control characters are rejected because Ghosthand translates them into keyboard events. It always sends `enter: false`; submitting is a separate, confirmed Press Enter action. It does not collect or enter iPhone passcodes.

## Progress, cancellation, and failures

Tasks stream progress by default. The **Task Progress** preference offers **Final Response Only (JSON)** for compatibility. A JSON response returned to a streaming request is also accepted. A failed stream never triggers an automatic second task submission.

Stop Task closes the stream and attempts to release the lease. Returning from the task view also requests cancellation. Actions already performed are not undone. JSON mode cannot guarantee that disconnecting stops a running operation; release waits for Ghosthand to finish it. A failed or truncated task, or a failed lease release, is not reported as successful completion.

Handled success, failure, and cancellation all attempt lease release. Cancellation during acquisition waits for the returned lease ID so it can be released. If Raycast is forcibly killed, the daemon disconnects, or an acquisition response is lost after the daemon created a lease, cleanup cannot be guaranteed; the lease has a 600-second idle timeout. Check Ghosthand's control plane before repeating an operation. The extension never blindly retries phone input.

## Troubleshooting

| State                                           | Next step                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Cannot reach the daemon                         | Install Ghosthand and run `ghosthand setup`; check `ghosthand daemon status`.          |
| No iPhone                                       | Use a USB data cable, unlock the iPhone, tap Trust, then refresh.                      |
| Locked or incomplete setup                      | Follow the daemon's reported setup step.                                               |
| Busy                                            | Read the displayed holder/reason and wait for their lease to finish.                   |
| Camera or Bluetooth unavailable                 | Complete permissions and pairing in Ghosthand setup.                                   |
| Login or plan requirement                       | Sign in through setup or review [Ghosthand plans](https://ghosthand.dev/docs/pricing). |
| Task, connection, or input verification failure | Inspect a fresh preview before deciding whether to repeat the operation.               |
| Lease invalid                                   | Return to device selection and refresh.                                                |
