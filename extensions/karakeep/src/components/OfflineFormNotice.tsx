import { Action, Form, Icon, openExtensionPreferences } from "@raycast/api";
import { useTranslation } from "../hooks/useTranslation";

/**
 * Shared offline treatment for the create forms.
 *
 * Two pieces that must stay in sync, hence one component: the inline notice at
 * the top of the form, and the Start action that has to sit FIRST in the
 * ActionPanel while offline. The form can't submit until the server is up, so
 * leaving Submit in the ↵ slot points the primary action at the one thing
 * guaranteed to fail.
 */

export function OfflineFormNotice({
  offline,
  canStart,
  unauthorized,
}: {
  offline: boolean;
  canStart?: boolean;
  unauthorized?: boolean;
}) {
  const { t } = useTranslation();
  // Checked first: the two states are mutually exclusive, and a rejected key is
  // the more specific diagnosis. Telling someone Karakeep "isn't running" when
  // it is up and refusing their key sends them to Docker instead of Settings.
  if (unauthorized) {
    return <Form.Description title={t("connection.unauthorized")} text={t("connection.unauthorizedFormHint")} />;
  }
  if (!offline) return null;
  // "Press ↵ to start it" is only true when the Start action is actually
  // offered. A hosted instance has nothing to start, so it gets the plain
  // statement instead of an instruction that goes nowhere.
  return (
    <Form.Description
      title={t("connection.offlineTitle")}
      text={canStart ? t("connection.offlineFormHint") : t("connection.offlineFormHintRemote")}
    />
  );
}

/**
 * Render FIRST in the ActionPanel — Raycast binds ↵ to the first action, which
 * is the whole point of this component.
 *
 * Gated on `canStart`, not merely on being offline: without a stopped local
 * container to start, this action would run the full probe and do nothing
 * visible. Offering it to a hosted user is a button that lies.
 */
export function StartKarakeepAction({
  offline,
  canStart,
  isRecovering,
  onStart,
}: {
  offline: boolean;
  canStart: boolean;
  isRecovering: boolean;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  if (!offline || !canStart) return null;
  return (
    <Action
      title={isRecovering ? t("connection.starting") : t("connection.start")}
      icon={Icon.Play}
      onAction={onStart}
    />
  );
}

/**
 * Render FIRST in the ActionPanel when the key was rejected — same contract as
 * StartKarakeepAction, opposite cause. Submit cannot succeed until the key
 * changes, so ↵ must go to the only thing that can fix it.
 */
export function OpenSettingsAction({ unauthorized }: { unauthorized: boolean }) {
  const { t } = useTranslation();
  if (!unauthorized) return null;
  return <Action title={t("connection.openSettings")} icon={Icon.Gear} onAction={openExtensionPreferences} />;
}
