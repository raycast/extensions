// src/commands/test-connection/index.tsx
// Test tenant connection with detailed diagnostics

import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { listTenants } from "../../lib/tenants";
import { validateTenantCredentials, OAuthError } from "../../lib/auth";
import type { TenantConfig } from "../../lib/auth";

interface TestResult {
  tenantName: string;
  endpoint: string;
  ssoEndpoint: string;
  clientId: string;
  scopes: string[];
  accountUrn?: string;
  success: boolean;
  errorMessage?: string;
  statusCode?: number;
  rawError?: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function testTenant(tenant: TenantConfig): Promise<TestResult> {
    try {
      const validation = await validateTenantCredentials(tenant);

      if (validation.valid) {
        return {
          tenantName: tenant.name,
          endpoint: tenant.tenantEndpoint,
          ssoEndpoint: tenant.ssoEndpoint,
          clientId: tenant.clientId,
          scopes: tenant.scopes,
          accountUrn: tenant.accountUrn,
          success: true,
        };
      } else {
        return {
          tenantName: tenant.name,
          endpoint: tenant.tenantEndpoint,
          ssoEndpoint: tenant.ssoEndpoint,
          clientId: tenant.clientId,
          scopes: tenant.scopes,
          accountUrn: tenant.accountUrn,
          success: false,
          errorMessage: validation.error,
        };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const statusCode = err instanceof OAuthError ? err.statusCode : undefined;

      return {
        tenantName: tenant.name,
        endpoint: tenant.tenantEndpoint,
        ssoEndpoint: tenant.ssoEndpoint,
        clientId: tenant.clientId,
        scopes: tenant.scopes,
        accountUrn: tenant.accountUrn,
        success: false,
        errorMessage: errorMsg,
        statusCode,
        rawError: err instanceof OAuthError ? err.body : undefined,
      };
    }
  }

  useEffect(() => {
    async function loadAndTest() {
      try {
        const tenants = await listTenants();
        if (tenants.length === 0) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const testResults = await Promise.all(tenants.map((t) => testTenant(t)));
        setResults(testResults);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Failed to load tenants" });
      }
      setIsLoading(false);
    }

    loadAndTest();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Test Connections"
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={() => pop()} />
        </ActionPanel>
      }
    >
      {results.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.Globe} title="No tenants to test" description="Add a tenant first" />
      )}

      {results.map((result) => (
        <List.Section key={result.tenantName} title={result.tenantName}>
          <List.Item
            icon={result.success ? Icon.CheckCircle : Icon.XMarkCircle}
            title={result.success ? "✓ Connection OK" : "✗ Connection Failed"}
            subtitle={result.success ? "Credentials are valid" : result.errorMessage}
            accessories={
              result.statusCode
                ? [{ text: `HTTP ${result.statusCode}` }]
                : result.success
                  ? [{ icon: Icon.Checkmark }]
                  : []
            }
          />

          <List.Item
            icon={Icon.Gear}
            title="Tenant Endpoint"
            subtitle={result.endpoint}
            accessories={[{ text: "Copy", icon: Icon.CopyClipboard }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Endpoint" content={result.endpoint} />
              </ActionPanel>
            }
          />

          <List.Item
            icon={Icon.Gear}
            title="SSO Endpoint"
            subtitle={result.ssoEndpoint}
            accessories={[{ text: "Copy", icon: Icon.CopyClipboard }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy SSO Endpoint" content={result.ssoEndpoint} />
              </ActionPanel>
            }
          />

          <List.Item
            icon={Icon.Key}
            title="Client ID"
            subtitle={result.clientId}
            accessories={[{ text: "Copy", icon: Icon.CopyClipboard }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Client ID" content={result.clientId} />
              </ActionPanel>
            }
          />

          <List.Item
            icon={Icon.Lock}
            title="Scopes"
            subtitle={result.scopes.join(" ")}
            accessories={[{ text: "Copy", icon: Icon.CopyClipboard }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Scopes" content={result.scopes.join(" ")} />
              </ActionPanel>
            }
          />

          {result.accountUrn && (
            <List.Item
              icon={Icon.Info}
              title="Account URN"
              subtitle={result.accountUrn}
              accessories={[{ text: "Copy", icon: Icon.CopyClipboard }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Account URN" content={result.accountUrn} />
                </ActionPanel>
              }
            />
          )}

          {result.rawError && (
            <List.Item
              icon={Icon.Bug}
              title="Raw Error Response"
              subtitle={result.rawError.slice(0, 100) + (result.rawError.length > 100 ? "..." : "")}
              accessories={[{ text: "Copy", icon: Icon.CopyClipboard }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Error" content={result.rawError} />
                </ActionPanel>
              }
            />
          )}

          {result.errorMessage && !result.success && (
            <List.Item
              icon={Icon.Warning}
              title="Error Details"
              subtitle={result.errorMessage}
              accessories={[{ text: "Copy", icon: Icon.CopyClipboard }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Error Message" content={result.errorMessage} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ))}
    </List>
  );
}
