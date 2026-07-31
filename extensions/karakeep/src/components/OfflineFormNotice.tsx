import { Action, Form, Icon } from "@raycast/api";
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

export function OfflineFormNotice({ offline, canStart }: { offline: boolean; canStart?: boolean }) {
  const { t } = useTranslation();
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
