import { Action, ActionPanel, Alert, Form, Toast, confirmAlert, showToast } from '@raycast/api';
import { useState } from 'react';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { encodeBackup, decodeBackup, describeBackupError } from './backup';
import { ImportLineError, describeInvalidLines, exportOtpAuthUri, parseOtpAuthUriList, summarizeImport } from './model';
import * as store from './store';

// Messages of this class are written by this file and never contain account data.
class SafeError extends Error {}

export function BackupForm({ mode, onDone }: { mode: 'import' | 'export'; onDone: () => Promise<void> }) {
  const [files, setFiles] = useState<string[]>(mode === 'export' ? [path.join(os.homedir(), 'Downloads')] : []);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [format, setFormat] = useState('encrypted');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (files.length !== 1) throw new Error('Select a file or destination folder.');
      if (mode === 'export') {
        if (format === 'encrypted' && (password.length < 12 || password !== confirmation))
          throw new Error('Use a password of at least 12 characters and confirm it.');
        const accounts = await store.getAccounts();
        if (!accounts.length) throw new Error('There are no accounts to export.');
        if (
          format === 'uri' &&
          accounts.some((account) => account.issuer?.includes(':') || (!account.issuer && account.name.includes(':')))
        ) {
          throw new Error(
            'A label contains an ambiguous colon. Use encrypted backup to preserve these account labels.',
          );
        }
        if (
          format === 'uri' &&
          !(await confirmAlert({
            title: 'Export Unencrypted Secrets?',
            message:
              'Anyone with this file can generate your codes. This portable export contains every setup secret. Store it securely and remove temporary copies after import.',
            primaryAction: { title: 'Export Secrets', style: Alert.ActionStyle.Destructive },
          }))
        )
          return;
        const text =
          format === 'encrypted'
            ? await encodeBackup(accounts, password)
            : accounts.map(exportOtpAuthUri).join('\n') + '\n';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const output = path.join(files[0], `otp-backup-${stamp}.${format === 'encrypted' ? 'json' : 'txt'}`);
        await writeFile(output, text, { mode: 0o600, flag: 'wx' });
        await showToast({ style: Toast.Style.Success, title: `${accounts.length} accounts exported`, message: output });
      } else {
        if ((await stat(files[0])).size > 10 * 1024 * 1024) throw new Error('Backup exceeds the 10 MB limit.');
        const text = await readFile(files[0], 'utf8');
        let inputs: Array<store.CreateAccount | store.Account> = [];
        let invalid: ImportLineError[] = [];
        if (format === 'encrypted') {
          try {
            inputs = await decodeBackup(text, password);
          } catch (error) {
            const reason = describeBackupError(error);
            throw reason ? new SafeError(reason) : error;
          }
        } else {
          const parsed = parseOtpAuthUriList(text);
          inputs = parsed.accounts;
          invalid = parsed.errors;
        }
        if (!inputs.length) {
          if (!invalid.length) throw new Error('No accounts found.');
          const more = invalid.length > 1 ? ` (+${invalid.length - 1} more)` : '';
          await showToast({
            style: Toast.Style.Failure,
            title: 'Import failed',
            message: `No valid accounts. Line ${invalid[0].line}: ${invalid[0].reason}${more}`,
          });
          return;
        }
        if (inputs.length > 1000) throw new SafeError('Too many accounts. Import up to 1000 at a time.');
        if (
          !(await confirmAlert({
            title: `Import ${inputs.length} ${inputs.length === 1 ? 'Account' : 'Accounts'}?`,
            message: [
              invalid.length
                ? `${inputs.length} valid, ${invalid.length} invalid. Invalid lines will be skipped:\n${describeInvalidLines(invalid)}`
                : '',
              'Existing accounts are kept. Exact duplicates are skipped. Encrypted backups also restore favourites and usage history.',
            ]
              .filter(Boolean)
              .join('\n\n'),
          }))
        )
          return;
        const result = await store.importAccounts(inputs);
        await showToast({
          style: Toast.Style.Success,
          title: summarizeImport({ added: result.added, duplicates: result.skipped, invalid: invalid.length }),
        });
      }
      await onDone();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const safe =
        error instanceof SafeError ||
        [
          'Select a file or destination folder.',
          'Use a password of at least 12 characters and confirm it.',
          'There are no accounts to export.',
          'Backup exceeds the 10 MB limit.',
          'No accounts found.',
          'A label contains an ambiguous colon. Use encrypted backup to preserve these account labels.',
        ].includes(message)
          ? message
          : 'Check the file, format, password, and destination permissions. Existing accounts were kept.';
      await showToast({
        style: Toast.Style.Failure,
        title: mode === 'export' ? 'Export failed' : 'Import failed',
        message: safe,
      });
    } finally {
      setBusy(false);
      setPassword('');
      setConfirmation('');
    }
  }
  return (
    <Form
      navigationTitle={mode === 'export' ? 'Export & Backup' : 'Import Accounts'}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={mode === 'export' ? 'Export Accounts' : 'Import Accounts'} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Format" value={format} onChange={setFormat}>
        <Form.Dropdown.Item value="encrypted" title="Encrypted OTP Backup (JSON)" />
        <Form.Dropdown.Item value="uri" title="Portable Setup URIs (Unencrypted Text)" />
      </Form.Dropdown>
      <Form.FilePicker
        id="files"
        title={mode === 'export' ? 'Destination Folder' : 'Backup File'}
        value={files}
        onChange={setFiles}
        allowMultipleSelection={false}
        canChooseDirectories={mode === 'export'}
        canChooseFiles={mode === 'import'}
      />
      {format === 'encrypted' && (
        <Form.PasswordField id="password" title="Backup Password" value={password} onChange={setPassword} />
      )}
      {mode === 'export' && format === 'encrypted' && (
        <Form.PasswordField
          id="confirmation"
          title="Confirm Password"
          value={confirmation}
          onChange={setConfirmation}
        />
      )}
      <Form.Description
        text={
          format === 'encrypted'
            ? 'Password-encrypted backup with settings, favourites, and recents. Keep the password separately; it cannot be recovered.'
            : 'One standard otpauth://totp/ URI per line. Preserves algorithm, digits and period. Favourites and recents are not included. This file exposes your setup secrets.'
        }
      />
    </Form>
  );
}
