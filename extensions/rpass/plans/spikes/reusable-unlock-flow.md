# Spike: Reusable passphrase unlock flow

## Current responsibilities

`src/vault/presentation/content.tsx` currently owns the unlock flow:

- calls `showEntry(entry, storepath, passphrase)`;
- detects `RpassError` with code `gpg_passphrase_required`;
- switches from list view to a passphrase form;
- validates that the passphrase input is non-empty;
- toggles passphrase visibility;
- retries loading with the submitted passphrase;
- stores the passphrase in React state for the current command session;
- passes the passphrase to `OtpRow` so `generateOtp` can use `--passphrase-stdin`.

`src/vault/presentation/otp-row.tsx` does not own unlock state; it receives `passphrase?: string` and calls `generateOtp(entry, storepath, passphrase)`.

`src/rpass/application/rpass-client.ts` must keep passing passphrases through stdin with `--passphrase-stdin`. It must never add `--passphrase <value>`.

## Minimal future abstraction

Do not extract an abstraction yet unless a second production caller appears, such as a write flow or another GPG-protected command. When needed, prefer one of these small shapes.

### Option A: `usePassphraseUnlock`

A hook could own:

- `passphrase?: string` for the current command session only;
- `needsPassphrase: boolean`;
- `passphraseInput: string`;
- `passphraseError?: string`;
- `passphraseVisible: boolean`;
- helpers for input update, validation, visibility toggle, and marking passphrase-required errors.

It must not own:

- the domain operation itself (`showEntry`, future `generate`, etc.);
- persistence outside React memory;
- global cache/keychain storage;
- CLI argv construction.

Callers should provide their own load/retry function and call the hook when they see `gpg_passphrase_required`.

### Option B: `PassphraseUnlockForm`

A component could render the existing Raycast form and accept:

- `isLoading`;
- `error?: string`;
- `visible: boolean`;
- `value: string`;
- `onChange(value)`;
- `onSubmit(passphrase)`;
- `onToggleVisible()`.

This is safer if only the duplicated UI is painful and each caller needs distinct operation state.

## Must not

- Must not persist GPG passphrases to disk, Raycast preferences, local storage, or logs.
- Must not pass a passphrase as `--passphrase <value>`.
- Must not show passphrases in toasts, copied errors, or telemetry.
- Must not broaden errors so invalid passphrases and missing GPG config become indistinguishable.

## Future tests

Before implementing a shared unlock abstraction, add or preserve tests that cover:

- passphrase-required error switches to unlock form;
- empty passphrase validation;
- successful retry stores passphrase only in component state;
- subsequent OTP call receives the passphrase;
- CLI argv uses `--passphrase-stdin` and stdin, never `--passphrase <value>`.

## Recommendation

Defer implementation for now. The current flow has one real owner (`Content`) and one consumer (`OtpRow`). Implement a shared hook or form only when adding the first write flow or another GPG-protected command would otherwise duplicate the form and retry logic.
