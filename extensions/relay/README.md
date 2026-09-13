# Relay

Upload a recently copied file to a remote machine over SSH, then copy its remote path for immediate use.

## Requirements

- macOS with Raycast installed
- A remote machine reachable over SSH
- Working SSH key authentication

Relay uses non-interactive SSH, so password prompts are not supported. Before using the extension, connect to the configured host in Terminal and confirm that the following command succeeds without a password prompt:

```sh
ssh your-host
```

This first connection also lets you verify the remote host key.

## Setup

Configure these preferences when Raycast prompts you:

- **SSH Host**: A hostname such as `user@example.com`, or an alias from `~/.ssh/config`.
- **Destination Directory**: An absolute remote path or a path beginning with `~/`. Relay creates the directory if it does not exist.

## Usage

1. Copy a file in Finder.
2. Run **Upload Clipboard File** in Raycast.
3. Choose the file from your recent clipboard history.
4. Relay uploads the file and copies its remote path to your clipboard.

Uploaded files are given a unique timestamp-based name while retaining the original file extension.

## Troubleshooting

- **SSH authentication failed**: Confirm that key authentication works with `ssh your-host` in Terminal.
- **SSH host is not trusted**: Connect once in Terminal and accept the host key after verifying its fingerprint.
- **Cannot create destination directory**: Choose a directory that your remote SSH user can write to.
- **Could not connect to SSH host**: Check the host, network connection, VPN, and SSH service.
