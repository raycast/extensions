import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getCredentials } from "./lib/api";
import { getAccessToken } from "./lib/auth";
import { CACHE_KEYS, getCached, setCached, removeCached } from "./lib/cache";
import { CACHE_TTL } from "./lib/constants";
import { CredentialWithAccounts } from "./lib/types";
import { LogoutAction } from "./components/logout-action";

function getStatusIcon(status: string): Icon {
  switch (status) {
    case "success":
      return Icon.CheckCircle;
    case "inactive":
      return Icon.XMarkCircle;
    case "manual":
      return Icon.BankNote;
    default:
      if (status.includes("error") || status.includes("auth") || status.includes("intervention")) {
        return Icon.ExclamationMark;
      }
      return Icon.QuestionMark;
  }
}

function getStatusColor(status: string): Color {
  switch (status) {
    case "success":
      return Color.Green;
    case "inactive":
      return Color.SecondaryText;
    case "manual":
      return Color.Blue;
    default:
      if (status.includes("error") || status.includes("auth") || status.includes("intervention")) {
        return Color.Red;
      }
      return Color.Orange;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function getCredentialTitle(credential: CredentialWithAccounts): string {
  if (credential.status === "manual") {
    return "Cash Tracking";
  }

  return credential.institution_name || `Credential #${credential.id}`;
}

export default function Command() {
  const [credentials, setCredentials] = useState<CredentialWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    async function fetchCredentials() {
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first - if we have valid cached data, use it immediately
        console.debug("[List Credentials] Checking cache...");
        const cached = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
        if (cached && cached.length > 0) {
          console.debug(`[List Credentials] Using cached data (${cached.length} credentials)`);
          setCredentials(cached);
          setIsLoading(false);
          // Fetch fresh data in the background (silently update cache)
          console.debug("[List Credentials] Background refresh started");
          try {
            await getAccessToken();
            const data = await getCredentials();
            console.debug(`[List Credentials] Background refresh complete (${data.length} credentials)`);
            setCredentials(data);
            setCached(CACHE_KEYS.dataSnapshot(), data, CACHE_TTL.ACCOUNTS);
          } catch (error) {
            console.debug(`[List Credentials] Background refresh failed: ${error}`);
            // If authentication fails, clear cache and show error
            if (
              error instanceof Error &&
              (error.message.includes("authentication") || error.message.includes("preferences"))
            ) {
              removeCached(CACHE_KEYS.dataSnapshot());
              setCredentials([]);
              setError(error.message);
              await showToast({
                style: Toast.Style.Failure,
                title: "Authentication required",
                message: "Please check your credentials in extension preferences",
              });
              return;
            }
            // Silently fail background refresh - we have cached data to show
          }
          return;
        }

        // No cache or cache expired - fetch fresh data
        console.debug("[List Credentials] Cache miss - fetching fresh data");
        await getAccessToken();
        const data = await getCredentials();
        setCredentials(data);
        setCached(CACHE_KEYS.dataSnapshot(), data, CACHE_TTL.ACCOUNTS);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch credentials";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCredentials();
  }, []);

  if (error && credentials.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Loading Credentials" description={error} />
      </List>
    );
  }

  const unsupportedCredentialTypes = ["manual"];

  return (
    <List isLoading={isLoading}>
      {credentials.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.List}
          title="No Credentials"
          description="No credentials found."
          actions={
            <ActionPanel>
              <LogoutAction onLogout={() => setCredentials([])} />
            </ActionPanel>
          }
        />
      ) : (
        credentials
          .filter((credential) => !unsupportedCredentialTypes.includes(credential.status))
          .sort((a, b) => getCredentialTitle(a).localeCompare(getCredentialTitle(b)))
          .map((credential) => (
            <List.Item
              key={credential.id}
              icon={{ source: getStatusIcon(credential.status), tintColor: getStatusColor(credential.status) }}
              title={getCredentialTitle(credential)}
              subtitle={credential.status}
              accessories={[
                {
                  text: credential.last_success ? `Last success: ${formatDate(credential.last_success)}` : "N/A",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Credential Details"
                    icon={Icon.Clipboard}
                    content={getCredentialTitle(credential)}
                  />
                  <LogoutAction onLogout={() => setCredentials([])} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Institution"
                        text={credential.institution_name || "N/A"}
                      />
                      <List.Item.Detail.Metadata.Label title="Status" text={credential.status} />
                      <List.Item.Detail.Metadata.Label
                        title="Institution ID"
                        text={credential.institution_id?.toString() || "N/A"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Auth Type"
                        text={credential.auth_type?.toString() || "N/A"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Last Success"
                        text={formatDate(credential.last_success)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Status Set At"
                        text={formatDate(credential.status_set_at)}
                      />
                      <List.Item.Detail.Metadata.Label title="Auto Run" text={credential.auto_run ? "Yes" : "No"} />
                      {credential.error_info && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Error Reason" text={credential.error_info.reason} />
                          <List.Item.Detail.Metadata.Label
                            title="Error Message"
                            text={credential.error_info.localized_description}
                          />
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))
      )}
    </List>
  );
}
