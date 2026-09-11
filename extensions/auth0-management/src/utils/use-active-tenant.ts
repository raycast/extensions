import { showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { Tenant } from "./types";
import { getTenants, isTenantConfigured } from "./tenant-storage";

/**
 * Hook that manages the active tenant state across all commands.
 * Loads tenants from LocalStorage, auto-selects the first configured tenant,
 * and provides a `switchTenant` function with validation and toast feedback.
 */
export function useActiveTenant() {
  const [tenantId, setTenantId] = useCachedState<string>("activeTenantId", "");
  const [tenants, setTenants] = useCachedState<Tenant[]>("tenants", []);
  const [isLoading, setIsLoading] = useCachedState<boolean>("tenantsLoading", true);
  const initialized = useRef(false);

  const loadTenants = async () => {
    const loaded = await getTenants();
    setTenants(loaded);
    return loaded;
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      setIsLoading(true);
      const loaded = await loadTenants();

      if (!tenantId || !loaded.find((t) => t.id === tenantId)) {
        const firstConfigured = loaded.find(isTenantConfigured);
        if (firstConfigured) {
          setTenantId(firstConfigured.id);
        } else if (loaded.length > 0) {
          setTenantId(loaded[0].id);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const tenant = tenants.find((t) => t.id === tenantId) ?? null;

  const switchTenant = (id: string) => {
    const target = tenants.find((t) => t.id === id);
    if (!target) return;

    if (!isTenantConfigured(target)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Tenant Not Configured",
        message: `Please configure ${target.name} credentials`,
      });
      return;
    }

    setTenantId(id);
    showToast({
      style: Toast.Style.Success,
      title: "Tenant Switched",
      message: `Now using ${target.name} (${target.domain})`,
    });
  };

  return { tenantId, tenant, tenants, switchTenant, loadTenants, isLoading } as const;
}
