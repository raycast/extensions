# Raccoon Changelog

## [Initial Version] - 2026-09-26

- Emptying the trash empties every mounted volume's, because Finder is what
  does it. The screen lists the other volumes and the confirmation counts them,
  rather than quoting the home trash for a deletion that is larger than that.
- A command that streams its work - Apps, Upgrade, a raw run, a fleet scan - is
  given up on after fifteen minutes of printing nothing, and says that is what
  happened. The bound is on silence rather than duration: these commands are
  legitimately long.
- The Homebrew install on the "CLI not found" screen can be stopped.
- Audit History names the saved runs it could not read instead of quietly
  listing one fewer.
- Cmd+Shift+E on the security audit saves the report as a document - Markdown,
  RTF, HTML, CSV or JSON - and reveals it in Finder. The audit is re-run rather
  than rendered from what is on screen: a report handed to someone else has to
  be the state of the machine now. Needs rcc 1.0.1.
- The security audit fills in as its answers arrive. One of its checks asks
  Apple's servers whether this Mac has updates, which is usually quick and
  occasionally minutes; the other twenty-four are on screen in about two
  seconds rather than waiting for it.
- Opening a screen does not act. `Apps` and `Upgrade` open in `--dry-run`; doing
  it for real is a separate, confirmed action.
- Environment and PATH Overlaps run under the login shell's PATH, not the
  extension's own, so what they audit is the PATH you actually have.
- Ports tells a listening socket from a connection in progress: only doors are
  reachable, and only doors are in the bulk close. A row says what lsof, as
  you, cannot see, and offers to list every user's ports in Terminal.
- Certificates are removed by SHA-256 from the login keychain only; Startup
  stops agents by their launchd label and lists what apps register in the
  background; Memory ranks by footprint and shows the machine's swap and
  compressor first; Wi-Fi tells connected from named.
- Twenty-one commands, each with a list built for what it reports rather than a
  rendered table: disk, memory, open ports, battery, network, Wi-Fi, SSH keys,
  certificates, startup items, fonts, PATH overlaps, shell history, Docker,
  Xcode, Time Machine, git repositories, the environment, the trash, and a
  security audit of the machine.
- Colour means one thing everywhere: red needs doing now, orange deserves
  attention, green is in order, grey is information.
- Enter resolves the row under the cursor and Cmd+Enter resolves everything on
  screen. What resolving is differs per command: quit that process, close that
  port, forget that network, remove that dangling symlink, push that clean
  repository, add a passphrase to that key. Where nothing is put right by a
  command, it opens the one place the setting actually lives.
- Anything that changes the machine asks first, shows the exact command it is
  about to run, and runs it in Terminal: several need administrator rights, and
  Touch ID has nowhere to prompt behind a Raycast view.
- Configure Admin Session installs a `visudo`-checked sudoers drop-in so Touch ID
  is asked once rather than once per privileged command; the duration is a
  preference.
- Cmd+T shows the raw output of the underlying command from any list.
