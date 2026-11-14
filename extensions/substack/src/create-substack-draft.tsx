import { useEffect, useState } from "react";

import { Detail, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { migrateLegacyAccount } from "@/lib/accounts";

import useAccounts from "@/hooks/useAccounts";

import AccountSetup from "@/components/AccountSetup";
import CreateDraftForm from "@/components/CreateDraftForm";

export default function CreateSubstackDraft() {
  const [legacyDraft] = useCachedState<unknown>("last-created-draft", null);
  const [history] = useCachedState<unknown[]>("created-drafts", []);
  const [migrationDone, setMigrationDone] = useState(false);
  const [migrationError, setMigrationError] = useState<string>();
  const { accounts, selectedId, setSelectedId, isLoading, error, reload } = useAccounts();
  async function migrate() {
    try {
      await migrateLegacyAccount(getPreferenceValues<Preferences.CreateSubstackDraft>(), [...history, legacyDraft]);
      setMigrationError(undefined);
      setMigrationDone(true);
      await reload();
    } catch (error) {
      setMigrationError(error instanceof Error ? error.message : "Could not import legacy preferences.");
    }
  }
  useEffect(() => {
    void migrate();
  }, []);
  if (migrationError || error)
    return (
      <AccountSetup
        message={migrationError ?? error!}
        onRefresh={() => {
          void migrate();
        }}
      />
    );
  if (!migrationDone || isLoading) return <Detail isLoading />;
  if (!accounts.length)
    return (
      <AccountSetup
        message="Add a connection in Manage Accounts to create unpublished drafts."
        onRefresh={() => {
          void reload();
        }}
      />
    );
  return <CreateDraftForm accounts={accounts} accountId={selectedId} onAccountChange={setSelectedId} />;
}
