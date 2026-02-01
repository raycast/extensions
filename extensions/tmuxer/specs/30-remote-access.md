# Remote Access (SSH or Mosh)

## SSH key setup (macOS client)
```bash
ssh-keygen -t ed25519 -C "raycast-tmux"
ssh-copy-id user@server_ip
```

## SSH config entry
```sshconfig
Host agentbox
  HostName <server_ip_or_dns>
  User <user>
  IdentityFile ~/.ssh/id_ed25519
  AddKeysToAgent yes
  ForwardAgent yes
```

Connect:
```bash
ssh agentbox
```

Optional roaming-friendly:
```bash
mosh agentbox
```

## Remote tmux commands
List sessions:
```bash
ssh agentbox "tmux list-sessions -F '#S' 2>/dev/null || true"
```

Attach (TTY required):
```bash
ssh agentbox -t "tmux new -A -s codex"
```

## Notes
- The -t flag is required so tmux can render.
