import { List } from "@raycast/api";
import { Vault } from "../api/vault/vault.types";
import { VaultSelection } from "./VaultSelection";
import { useEffect, useState, useCallback } from "react";
import { getDefaultVault, updateLastAccessed } from "../utils/vault-context";
import { GlobalPreferences } from "../utils/preferences";
import { EnhancedVault } from "../utils/vault-config";

interface SmartVaultSelectionProps {
  vaults: Vault[];
  target: (vault: Vault, onSwitchVault: () => void) => React.ReactNode;
  preferences: GlobalPreferences;
  allowAllVaults?: boolean;
  onAllVaults?: () => React.ReactNode;
  forceSelection?: boolean; // Force showing selection even if useActiveVaultAsDefault is true
}

/**
 * Smart vault selection component that:
 * - Auto-selects active vault if useActiveVaultAsDefault is enabled
 * - Auto-selects if only one vault exists
 * - Shows VaultSelection otherwise
 * - Provides a callback to switch vaults from within the target component
 */
export function SmartVaultSelection(props: SmartVaultSelectionProps) {
  const {
    vaults,
    target,
    preferences,
    allowAllVaults = false,
    onAllVaults,
  } = props;
  const [defaultVault, setDefaultVault] = useState<EnhancedVault | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowSelection, setShouldShowSelection] = useState(false);

  // Callback to force showing vault selection (used by "Switch Vault" action)
  const handleSwitchVault = useCallback(() => {
    setShouldShowSelection(true);
  }, []);

  useEffect(() => {
    async function determineVault() {
      setIsLoading(true);

      // If already showing selection, don't re-evaluate
      if (shouldShowSelection) {
        setIsLoading(false);
        return;
      }

      // If only one vault, auto-select it (no switch option needed)
      if (vaults.length === 1) {
        const vault = vaults[0];
        await updateLastAccessed(vault.key);
        setDefaultVault(null);
        setIsLoading(false);
        return;
      }

      // If no vaults, show empty state
      if (vaults.length === 0) {
        setDefaultVault(null);
        setIsLoading(false);
        return;
      }

      // Check if useActiveVaultAsDefault is enabled
      if (preferences.useActiveVaultAsDefault) {
        const vault = await getDefaultVault(vaults);
        if (vault) {
          await updateLastAccessed(vault.key);
          setDefaultVault(vault);
          setIsLoading(false);
          return;
        }
      }

      // Show selection if no default was found or preference is disabled
      setShouldShowSelection(true);
      setIsLoading(false);
    }

    determineVault();
  }, [vaults, preferences.useActiveVaultAsDefault]);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  // Show vault selection
  if (shouldShowSelection) {
    return (
      <VaultSelection
        vaults={vaults}
        target={(vault: Vault) => target(vault, handleSwitchVault)}
        allowAllVaults={allowAllVaults}
        onAllVaults={onAllVaults}
      />
    );
  }

  // Auto-select single vault (no switch needed - only one vault)
  if (vaults.length === 1) {
    return <>{target(vaults[0], handleSwitchVault)}</>;
  }

  // Auto-select default vault with switch capability
  if (defaultVault) {
    return <>{target(defaultVault, handleSwitchVault)}</>;
  }

  // Fallback to vault selection
  return (
    <VaultSelection
      vaults={vaults}
      target={(vault: Vault) => target(vault, handleSwitchVault)}
      allowAllVaults={allowAllVaults}
      onAllVaults={onAllVaults}
    />
  );
}
