import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { useMemo, useState } from "react";
import { newLoginItem } from "./vendor/client-core/index.js";
import { generatePassword, passwordStrength } from "./vendor/shared/index.js";
import { UnlockForm } from "./components/UnlockForm";
import { describeError } from "./lib/errors";
import type { ActiveSession } from "./lib/session";
import { useSession } from "./lib/useSession";

export default function CreateCommand() {
  const { session, setSession, loading } = useSession();
  if (loading) return <Form isLoading />;
  if (!session) return <UnlockForm onUnlocked={setSession} />;
  return <CreateForm session={session} />;
}

const STRENGTH_LABEL = ["molto debole", "debole", "discreta", "buona", "ottima"];

function CreateForm({ session }: { session: ActiveSession }) {
  const vaults = useMemo(() => session.vault.listWritableVaults(), [session]);
  const [vaultId, setVaultId] = useState(vaults[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [totp, setTotp] = useState("");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function generate() {
    setPassword(generatePassword({ length: 20 }));
  }

  async function submit() {
    if (!title.trim()) {
      setTitleError("Il titolo è obbligatorio");
      return;
    }
    if (!vaultId) {
      await showToast({ style: Toast.Style.Failure, title: "Nessun vault scrivibile" });
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Salvataggio…" });
    try {
      const item = newLoginItem({
        title: title.trim(),
        username: username.trim(),
        password,
        urls: url.trim() ? [url.trim()] : [],
        notes,
        totp: totp.trim() || undefined,
      });
      await session.vault.createItem(vaultId, item);
      session.persist();
      toast.style = Toast.Style.Success;
      toast.title = "Salvato in Passig";
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Salvataggio fallito";
      toast.message = describeError(err);
    } finally {
      setBusy(false);
    }
  }

  const strength = password ? STRENGTH_LABEL[passwordStrength(password)] : undefined;

  return (
    <Form
      isLoading={busy}
      navigationTitle="Salva password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Salva" icon={Icon.SaveDocument} onSubmit={submit} />
          <Action title="Genera password" icon={Icon.Wand} shortcut={{ modifiers: ["cmd"], key: "g" }} onAction={generate} />
        </ActionPanel>
      }
    >
      {vaults.length === 0 ? (
        <Form.Description title="Vault" text="Non hai vault con permesso di scrittura." />
      ) : (
        <Form.Dropdown id="vault" title="Vault" value={vaultId} onChange={setVaultId}>
          {vaults.map((v) => (
            <Form.Dropdown.Item key={v.id} value={v.id} title={v.name} icon={v.organizationId ? Icon.TwoPeople : Icon.Person} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="title"
        title="Titolo"
        placeholder="es. GitHub"
        value={title}
        error={titleError}
        onChange={(v) => {
          setTitle(v);
          setTitleError(undefined);
        }}
        autoFocus
      />
      <Form.TextField id="username" title="Username" placeholder="email o nome utente" value={username} onChange={setUsername} />
      <Form.PasswordField
        id="password"
        title="Password"
        value={password}
        onChange={setPassword}
        info={strength ? `Robustezza: ${strength}. ⌘G per generarne una.` : "⌘G per generare una password robusta"}
      />
      <Form.TextField id="url" title="URL" placeholder="https://esempio.it" value={url} onChange={setUrl} />
      <Form.TextField id="totp" title="TOTP (opzionale)" placeholder="otpauth://totp/… oppure chiave base32" value={totp} onChange={setTotp} />
      <Form.TextArea id="notes" title="Note" value={notes} onChange={setNotes} />
    </Form>
  );
}
