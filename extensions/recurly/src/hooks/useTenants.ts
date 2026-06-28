import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { TenantConfiguration } from "../TenantConfiguration";

const tenantsKey = "tenants";

type UseTenants = {
  tenantsLoading: boolean;
  tenants: TenantConfiguration[];
};

export default function useTenants() {
  const [state, setState] = useState<UseTenants>({ tenantsLoading: true, tenants: [] });

  const createTenant = (tenant: TenantConfiguration): Promise<void> =>
    new Promise((resolve, reject) => {
      if (tenant.name.length === 0) {
        return reject(new Error("Name is empty"));
      }

      if (tenant.subdomain.length === 0) {
        return reject(new Error("Subdomain is empty"));
      }

      if (tenant.apiKey.length === 0) {
        return reject(new Error("API Key is empty"));
      }

      if (state.tenants.find((item) => item.name === tenant.name)) {
        return reject(new Error("Tenant with the given name already exists"));
      }

      const updatedTenants = state.tenants.concat(tenant).sort((left, right) => (left.name < right.name ? -1 : 1));

      LocalStorage.setItem(tenantsKey, JSON.stringify(updatedTenants))
        .then(() => setState((prev) => ({ ...prev, tenants: updatedTenants })))
        .then(() => resolve(undefined));
    });

  const editTenant = (previous: TenantConfiguration, update: TenantConfiguration) =>
    new Promise((resolve, reject) => {
      if (update.name.length === 0) {
        return reject(new Error("Name is empty"));
      }

      if (update.subdomain.length === 0) {
        return reject(new Error("Subdomain is empty"));
      }

      if (update.apiKey.length === 0) {
        return reject(new Error("API Key is empty"));
      }

      if (previous.name !== update.name && state.tenants.find((item) => item.name === update.name)) {
        return reject(new Error("Tenant with the given name already exists"));
      }

      const updatedTenants = state.tenants
        .filter((tenant) => tenant.name !== previous.name)
        .concat(update)
        .sort((left, right) => (left.name < right.name ? -1 : 1));

      LocalStorage.setItem(tenantsKey, JSON.stringify(updatedTenants))
        .then(() => setState((prev) => ({ ...prev, tenants: updatedTenants })))
        .then(() => resolve(undefined));
    });

  const deleteTenant = (tenant: TenantConfiguration): Promise<void> =>
    new Promise((resolve) => {
      const updatedTenants = state.tenants.filter((item) => item.name !== tenant.name);

      LocalStorage.setItem(tenantsKey, JSON.stringify(updatedTenants))
        .then(() => setState((prev) => ({ ...prev, tenants: updatedTenants })))
        .then(() => resolve(undefined));
    });

  useEffect(() => {
    LocalStorage.getItem(tenantsKey).then((serialized) => {
      if (serialized === undefined) {
        return setState((prev) => ({ ...prev, tenantsLoading: false }));
      }

      setState({
        tenantsLoading: false,
        tenants: JSON.parse(serialized as string) as TenantConfiguration[],
      });
    });
  }, []);

  return { ...state, createTenant, editTenant, deleteTenant };
}
