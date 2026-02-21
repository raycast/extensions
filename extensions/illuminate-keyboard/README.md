# Illuminate Keyboard

A Raycast extension that toggles the MacBook keyboard backlight on and off with a single command.
I was so annoyed to do that manually once I want to watch Netflix on my macbook. So I've built a small extension 😊2

## Requirements

- macOS
- MacBook with a backlit keyboard
- [Raycast](https://raycast.com)

## Usage

Open Raycast and search for **"Toggle Keyboard Light"**. The command toggles the keyboard backlight between off (0) and maximum brightness (1).

## How It Works

The extension ships a pre-compiled Swift CLI binary (`assets/keyboard`) that controls the keyboard backlight via Apple's **CoreBrightness** private framework.

> **Note:** CoreBrightness is an undocumented Apple private framework. Its API is not guaranteed to be stable across macOS versions. If a future macOS update changes or removes this framework, the extension may stop working until updated.

## Development

### Building the Swift helper

```bash
./build-helper.sh
```

This produces a universal binary (arm64 + x86_64) at `assets/keyboard`.

### Verifying the binary

The pre-built binary can be verified against its SHA-256 checksum:

```
ed7ca61c66b9dde8ad20b5d9239362cb5558620cc6762c4c4169ef6a65f1c33c  assets/keyboard
```

To verify:

```bash
shasum -a 256 assets/keyboard
```

To rebuild from source:

```bash
pnpm run build:native
```

### Running the extension

```bash
pnpm install
pnpm run dev
```
