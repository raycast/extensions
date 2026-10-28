import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { PlanLimitError, canAddItems, newLoginItem, shouldOfferUpgrade } from "./vendor/client-core/index.js";
import { generatePassword, passwordStrength } from "./vendor/shared/index.js";
import { UnlockForm } from "./components/UnlockForm";
import { t } from "./i18n";
import { BillingActions, PlanDetail, openCheckout, personalVaultIds, useBilling } from "./lib/billing";
import { describeError } from "./lib/errors";
import { planErrorMessage, strengthLabel, upgradeCta } from "./lib/plan";
import type { ActiveSession } from "./lib/session";
import { useSession } from "./lib/useSession";

export default function CreateCommand() {
  const { session, setSession, loading } = useSession();
  if (loading) return <Form isLoading />;
  if (!session) return <UnlockForm onUnlocked={setSession} />;
  return <CreateForm session={session} />;
}

function CreateForm({ session }: { session: ActiveSession }) {
  const { push } = useNavigation();
  const vaults = useMemo(() => session.vault.listWritableVaults(), [session]);
  const personal = useMemo(() => personalVaultIds(session.vault), [session]);
  const { billing, reload: reloadBilling } = useBilling(session);
  const [vaultId, setVaultId] = useState(vaults[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [totp, setTotp] = useState("");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  // i limiti del piano valgono solo per i vault personali creati dall'utente
  const atLimit = billing !== null && personal.has(vaultId) && !canAddItems(billing);

  /** Toast di errore per il limite del piano, con l'azione di upgrade (o il dettaglio del piano). */
  function planLimitToast(toast: Toast, message: string) {
    toast.style = Toast.Style.Failure;
    toast.title = t("create.planLimitTitle");
    toast.message = message;
    toast.primaryAction =
      billing && shouldOfferUpgrade(billing)
        ? { title: upgradeCta(billing), onAction: () => void openCheckout(session) }
        : { title: t("common.planDetail"), onAction: () => push(<PlanDetail session={session} initial={billing} />) };
  }

  function generate() {
    setPassword(generatePassword({ length: 20 }));
  }

  async function submit() {
    if (!title.trim()) {
      setTitleError(t("create.titleRequired"));
      return;
    }
    if (!vaultId) {
      await showToast({ style: Toast.Style.Failure, title: t("common.noWritableVault") });
      return;
    }
    if (atLimit) {
      const toast = await showToast({ style: Toast.Style.Failure, title: t("create.planLimitTitle") });
      planLimitToast(toast, planErrorMessage("PLAN_LIMIT_ITEMS"));
      return;
    }
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: t("create.saving") });
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
      toast.title = t("create.saved");
      await popToRoot();
    } catch (err) {
      if (err instanceof PlanLimitError) {
        planLimitToast(toast, err.message);
        void reloadBilling();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = t("create.saveFailed");
        toast.message = describeError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  const strength = password ? strengthLabel(passwordStrength(password)) : undefined;

  return (
    <Form
      isLoading={busy}
      navigationTitle={t("create.navTitle")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("common.save")} icon={Icon.SaveDocument} onSubmit={submit} />
          <Action
            title={t("create.generate")}
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={generate}
          />
          <ActionPanel.Section>
            <Action.Push
              title={t("common.planDetail")}
              icon={Icon.Star}
              target={<PlanDetail session={session} initial={billing} />}
            />
            <BillingActions session={session} billing={billing} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {atLimit && billing && (
        <Form.Description
          title={t("create.freePlan")}
          text={t("create.limitReached", { max: billing.limits.maxItems ?? 0 })}
        />
      )}
      {vaults.length === 0 ? (
        <Form.Description title={t("common.vault")} text={t("common.noWritableVaultText")} />
      ) : (
        <Form.Dropdown id="vault" title={t("common.vault")} value={vaultId} onChange={setVaultId}>
          {vaults.map((v) => (
            <Form.Dropdown.Item
              key={v.id}
              value={v.id}
              title={v.name}
              icon={v.organizationId ? Icon.TwoPeople : Icon.Person}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="title"
        title={t("common.title")}
        placeholder={t("create.titlePlaceholder")}
        value={title}
        error={titleError}
        onChange={(v) => {
          setTitle(v);
          setTitleError(undefined);
        }}
        autoFocus
      />
      <Form.TextField
        id="username"
        title={t("common.username")}
        placeholder={t("create.usernamePlaceholder")}
        value={username}
        onChange={setUsername}
      />
      <Form.PasswordField
        id="password"
        title={t("common.password")}
        value={password}
        onChange={setPassword}
        info={strength ? t("create.strengthInfo", { strength }) : t("create.generateInfo")}
      />
      <Form.TextField
        id="url"
        title={t("common.url")}
        placeholder={t("create.urlPlaceholder")}
        value={url}
        onChange={setUrl}
      />
      <Form.TextField
        id="totp"
        title={t("create.totpTitle")}
        placeholder={t("create.totpPlaceholder")}
        value={totp}
        onChange={setTotp}
      />
      <Form.TextArea id="notes" title={t("common.notes")} value={notes} onChange={setNotes} />
    </Form>
  );
}
