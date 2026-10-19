import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast } from '@raycast/api';
import { useEffect, useState } from 'react';
import * as store from './store';
import { describeAccountError, normalizeSecret, parseOtpAuthUri } from './model';
import { serviceName } from './services';

type Errors = { name?: string; secret?: string; period?: string };
type Draft = {
  name: string;
  issuer: string;
  secret: string;
  algorithm: string;
  digits: string;
  period: string;
  favorite: boolean;
};

// An unfinished new account survives closing Raycast, e.g. to copy the setup key from somewhere else.
// LocalStorage is encrypted by Raycast and only readable by this extension, like the saved accounts.
const DRAFT_KEY = 'one-time-password-account-draft';
const EMPTY_DRAFT: Draft = {
  name: '',
  issuer: '',
  secret: '',
  algorithm: 'SHA1',
  digits: '6',
  period: '30',
  favorite: false,
};

async function readDraft(): Promise<Draft | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(DRAFT_KEY);
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : undefined;
  } catch {
    return undefined;
  }
}

function secretError(value: string): string | undefined {
  if (!value.trim()) return 'Required';
  try {
    normalizeSecret(value);
  } catch {
    return 'Invalid Base32 key';
  }
}

function periodError(value: string): string | undefined {
  const period = Number(value);
  return /^\d+$/.test(value.trim()) && period >= 1 && period <= 300 ? undefined : 'Use 1–300 seconds';
}

export function AccountForm({ account, onSaved }: { account?: store.Account; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(account?.name ?? '');
  const [issuer, setIssuer] = useState(account?.issuer ?? '');
  const [secret, setSecret] = useState(account?.secret ?? '');
  const [algorithm, setAlgorithm] = useState(account?.algorithm ?? 'SHA1');
  const [digits, setDigits] = useState(String(account?.digits ?? 6));
  const [period, setPeriod] = useState(String(account?.period ?? 30));
  const [favorite, setFavorite] = useState(account?.favorite ?? false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  // Edits of existing accounts are not drafted; for new ones the draft is read before anything is written back.
  const [draftReady, setDraftReady] = useState(!!account);
  const draft: Draft = { name, issuer, secret, algorithm, digits, period, favorite };
  const hasDraft = JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT);
  function fill(value: Draft) {
    setName(value.name);
    setIssuer(value.issuer);
    setSecret(value.secret);
    setAlgorithm(value.algorithm as store.Account['algorithm']);
    setDigits(value.digits);
    setPeriod(value.period);
    setFavorite(value.favorite);
  }
  useEffect(() => {
    if (account) return;
    void readDraft().then((saved) => {
      if (saved) fill(saved);
      setDraftReady(true);
    });
  }, []);
  useEffect(() => {
    if (account || !draftReady) return;
    if (hasDraft) void LocalStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else void LocalStorage.removeItem(DRAFT_KEY);
  }, [draftReady, name, issuer, secret, algorithm, digits, period, favorite]);
  // Pasting a full otpauth:// link fills in every field at once.
  function changeSecret(value: string) {
    setErrors((current) => ({ ...current, secret: undefined }));
    if (!/^otpauth:/i.test(value.trim())) {
      setSecret(value);
      return;
    }
    try {
      const parsed = parseOtpAuthUri(value.trim());
      setName(parsed.name);
      setIssuer(parsed.issuer ? serviceName(parsed.issuer) : '');
      setSecret(parsed.secret);
      setAlgorithm(parsed.algorithm);
      setDigits(String(parsed.digits));
      setPeriod(String(parsed.period));
      setErrors({});
    } catch (error) {
      setSecret(value);
      setErrors((current) => ({ ...current, secret: describeAccountError(error) }));
    }
  }
  async function submit() {
    if (saving) return;
    const found: Errors = {
      name: name.trim() ? undefined : 'Required',
      secret: errors.secret ?? secretError(secret),
      period: periodError(period),
    };
    setErrors(found);
    if (found.name || found.secret || found.period) return;
    setSaving(true);
    try {
      const value = {
        ...account,
        name: name.trim(),
        issuer: serviceName(issuer) || undefined,
        secret: secret.trim(),
        algorithm: algorithm as store.Account['algorithm'],
        digits: Number(digits),
        period: Number(period),
        favorite,
      };
      if (account) await store.updateAccount({ ...value, id: account.id });
      else {
        await store.addAccount(value);
        await LocalStorage.removeItem(DRAFT_KEY);
      }
      await showToast({ style: Toast.Style.Success, title: account ? 'Account updated' : 'Account added' });
      await onSaved();
    } catch (error) {
      const exists = error instanceof Error && error.message === 'Account already exists';
      await showToast({
        style: Toast.Style.Failure,
        title: exists ? 'Account already exists' : 'Account not saved',
        message: exists ? 'The same key is already saved for this service and username.' : describeAccountError(error),
      });
    } finally {
      setSaving(false);
    }
  }
  // Raycast fields have no inline reveal button, so the key is shown by swapping in a plain text field.
  const secretProps = {
    title: 'Secret Key',
    placeholder: 'Setup key or otpauth:// link',
    value: secret,
    error: errors.secret,
    onChange: changeSecret,
    onBlur: () => secret && setErrors((current) => ({ ...current, secret: current.secret ?? secretError(secret) })),
    info: `The Base32 setup key from the service; spaces are ignored. Pasting an otpauth:// link fills in every field. Use Show Secret Key in the actions to check what you entered.`,
  };
  return (
    <Form
      navigationTitle={account ? 'Edit Account' : 'Add Account'}
      isLoading={saving || !draftReady}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={account ? 'Save Account' : 'Add Account'} onSubmit={submit} />
          <Action
            title={showSecret ? 'Hide Secret Key' : 'Show Secret Key'}
            icon={showSecret ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{
              macOS: { modifiers: ['cmd', 'shift'], key: 'e' },
              Windows: { modifiers: ['ctrl', 'shift'], key: 'e' },
            }}
            onAction={() => setShowSecret((value) => !value)}
          />
          {!account && hasDraft && (
            <Action
              title="Clear Form"
              icon={Icon.Eraser}
              shortcut={{
                macOS: { modifiers: ['cmd', 'shift'], key: 'backspace' },
                Windows: { modifiers: ['ctrl', 'shift'], key: 'backspace' },
              }}
              onAction={() => {
                fill(EMPTY_DRAFT);
                setErrors({});
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="issuer"
        title="Service"
        placeholder="GitHub, Google, Microsoft…"
        value={issuer}
        onChange={setIssuer}
        onBlur={() => setIssuer(serviceName(issuer))}
        info="A website address works too: accounts.google.com becomes Google."
      />
      <Form.TextField
        id="name"
        title="Username"
        placeholder="you@example.com"
        value={name}
        error={errors.name}
        onChange={(value) => {
          setName(value);
          setErrors((current) => ({ ...current, name: undefined }));
        }}
      />
      {showSecret ? (
        <Form.TextField id="secret-visible" {...secretProps} />
      ) : (
        <Form.PasswordField id="secret" {...secretProps} />
      )}
      <Form.Separator />
      <Form.Dropdown
        id="algorithm"
        title="Algorithm"
        value={algorithm}
        onChange={(value) => setAlgorithm(value as store.Account['algorithm'])}
      >
        <Form.Dropdown.Item value="SHA1" title="SHA-1" />
        <Form.Dropdown.Item value="SHA256" title="SHA-256" />
        <Form.Dropdown.Item value="SHA512" title="SHA-512" />
      </Form.Dropdown>
      <Form.Dropdown id="digits" title="Code Length" value={digits} onChange={setDigits}>
        {[6, 7, 8].map((n) => (
          <Form.Dropdown.Item key={n} value={String(n)} title={`${n} digits`} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="period"
        title="Period (Seconds)"
        value={period}
        error={errors.period}
        onChange={(value) => {
          setPeriod(value);
          setErrors((current) => ({ ...current, period: undefined }));
        }}
        onBlur={() => setErrors((current) => ({ ...current, period: periodError(period) }))}
        info="Keep the service’s original setting. Usually 30 seconds."
      />
      <Form.Checkbox id="favorite" label="Add to favourites" value={favorite} onChange={setFavorite} />
    </Form>
  );
}
