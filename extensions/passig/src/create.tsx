import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { PlanLimitError, canAddItems, newLoginItem, shouldOfferUpgrade } from "./vendor/client-core/index.js";
import { generatePassword, passwordStrength, type BillingStatus } from "./vendor/shared/index.js";
import { UnlockForm } from "./components/UnlockForm";
import { t } from "./lib/text";
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

  // plan limits only apply to the personal vaults owned by the user
  const atLimit = billing !== null && personal.has(vaultId) && !canAddItems(billing);

  /** Plan-limit error toast, with the upgrade action (or the plan details). */
  function planLimitToast(toast: Toast, message: string, status: BillingStatus | null = billing) {
    toast.style = Toast.Style.Failure;
    toast.title = t("create.planLimitTitle");
    toast.message = message;
    toast.primaryAction =
      status && shouldOfferUpgrade(status)
        ? { title: upgradeCta(status), onAction: () => void openCheckout(session) }
        : { title: t("common.planDetail"), onAction: () => push(<PlanDetail session={session} initial={status} />) };
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
      // the plan may have changed since the form opened (e.g. upgrade just completed): re-check first
      const fresh = await reloadBilling();
      if (fresh && personal.has(vaultId) && !canAddItems(fresh)) {
        const toast = await showToast({ style: Toast.Style.Failure, title: t("create.planLimitTitle") });
        planLimitToast(toast, planErrorMessage("PLAN_LIMIT_ITEMS"), fresh);
        return;
      }
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
      await session.persist();
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
