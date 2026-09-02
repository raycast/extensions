# Raccoon Changelog

## [Initial Version] - {PR_MERGE_DATE}

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
  screen. What resolving is differs per command — quit that process, close that
  port, forget that network, remove that dangling symlink, push that clean
  repository, add a passphrase to that key — and where nothing is put right by a
  command, it opens the one place the setting actually lives.
- Anything that changes the machine asks first, shows the exact command it is
  about to run, and runs it in Terminal: several need administrator rights, and
  Touch ID has nowhere to prompt behind a Raycast view.
- Configure Admin Session installs a `visudo`-checked sudoers drop-in so Touch ID
  is asked once rather than once per privileged command; the duration is a
  preference.
- Cmd+T shows the raw output of the underlying command from any list.
