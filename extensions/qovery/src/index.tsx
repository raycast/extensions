import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, getPreferenceValues } from "@raycast/api";

interface Service {
  id: string;
  name: string;
  service_type: string;
  project_id: string;
  project_name: string;
  environment_id: string;
  environment_name: string;
  updated_at: string;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  updated_at: string;
}

interface ServiceLink {
  url: string;
}

interface Preferences {
  apiToken: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showOrganizations, setShowOrganizations] = useState(false);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceLinks, setServiceLinks] = useState<ServiceLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  useEffect(() => {
    loadStoredCredentials();
  }, []);

  const loadStoredCredentials = async () => {
    try {
      const storedOrgId = await LocalStorage.getItem("qovery_organization_id");

      if (preferences.apiToken && storedOrgId) {
        setOrganizationId(storedOrgId as string);
        fetchServices(preferences.apiToken, storedOrgId as string);
      } else if (preferences.apiToken) {
        // API token is available but no organization selected
        fetchOrganizations(preferences.apiToken);
      } else {
        setShowConfig(true);
        setIsLoading(false);
      }
    } catch (err) {
      setShowConfig(true);
      setIsLoading(false);
    }
  };

  const fetchOrganizations = async (token: string) => {
    if (!token) {
      setError("API Token is required to fetch organizations.");
      return;
    }

    setIsLoadingOrgs(true);
    setError(null);

    try {
      const response = await fetch("https://api.qovery.com/organization", {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API token. Please check your credentials.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = (await response.json()) as { results?: Organization[] };
      setOrganizations(data.results || []);
      setShowOrganizations(true);

      if (data.results && data.results.length > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Organizations loaded",
          message: `Found ${data.results.length} organization(s)`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const saveCredentials = async (orgId: string) => {
    try {
      await LocalStorage.setItem("qovery_organization_id", orgId);
      setOrganizationId(orgId);
      setShowConfig(false);
      setShowOrganizations(false);
      return true;
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save organization ID",
      });
      return false;
    }
  };

  const fetchServices = async (token = preferences.apiToken, orgId = organizationId) => {
    if (!token || !orgId) {
      setError("API Token and Organization ID are required.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.qovery.com/organization/${orgId}/services`, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API token. Please check your credentials.");
        } else if (response.status === 404) {
          throw new Error("Organization not found. Please check your organization ID.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = (await response.json()) as { results?: Service[] };
      setServices(data.results || []);

      if (data.results && data.results.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No services found",
          message: "No services found in this organization.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openInQovery = (service: Service) => {
    if (!service || !service.project_id || !service.environment_id || !service.id) {
      return null;
    }

    const serviceType = service.service_type?.toLowerCase() || "application";
    const url = `https://console.qovery.com/organization/${organizationId}/project/${service.project_id}/environment/${service.environment_id}/${serviceType}/${service.id}/general`;
    return url;
  };

  const fetchServiceLinks = async (service: Service) => {
    if (!service || !service.id || !service.project_id || !service.environment_id) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Service information is incomplete",
      });
      return;
    }

    // Reset input values and states
    setShowConfig(false);
    setShowOrganizations(false);
    setOrganizations([]);
    setError(null);

    setIsLoadingLinks(true);
    setSelectedService(service);
    setServiceLinks([]);

    try {
      let endpoint = "";
      const serviceType = service.service_type?.toLowerCase();

      // Determine the correct endpoint based on service type
      if (serviceType === "application") {
        endpoint = `https://api.qovery.com/application/${service.id}/link`;
      } else if (serviceType === "container") {
        endpoint = `https://api.qovery.com/container/${service.id}/link`;
      } else if (serviceType === "helm") {
        endpoint = `https://api.qovery.com/helm/${service.id}/link`;
      } else {
        throw new Error(`Unsupported service type: ${serviceType}`);
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Token ${preferences.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API token. Please check your credentials.");
        } else if (response.status === 404) {
          throw new Error("Service links not found.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = (await response.json()) as { results?: ServiceLink[] };
      setServiceLinks(data.results || []);
      setShowLinks(true);

      if (data.results && data.results.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No links found",
          message: "This service has no configured links.",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Links loaded",
          message: `Found ${data?.results?.length} link(s)`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const clearCredentials = async () => {
    try {
      await LocalStorage.removeItem("qovery_organization_id");
      setOrganizationId("");
      setShowConfig(true);
      setShowOrganizations(false);
      setOrganizations([]);
      setServices([]);
      setError(null);
      setShowLinks(false);
      setSelectedService(null);
      setServiceLinks([]);
      showToast({
        style: Toast.Style.Success,
        title: "Organization cleared",
        message: "Please select a new organization",
      });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to clear organization",
      });
    }
  };

  if (showLinks) {
    return (
      <List isLoading={isLoadingLinks}>
        <List.Section title={`Links for ${selectedService?.name || "Service"}`}>
          {serviceLinks.length === 0 && !isLoadingLinks && (
            <List.EmptyView icon="🔗" title="No Links Found" description="This service has no configured links" />
          )}
          {serviceLinks.map((link, index) => (
            <List.Item
              key={index}
              icon={Icon.Link}
              title={link.url}
              actions={
                <ActionPanel>
                  {link.url && <Action.OpenInBrowser title="Open Link" url={link.url} />}
                  <Action.CopyToClipboard title="Copy Link URL" content={link.url || ""} />
                  <Action
                    title="Back to Services"
                    onAction={() => {
                      setShowLinks(false);
                      setSelectedService(null);
                      setServiceLinks([]);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  if (showOrganizations) {
    return (
      <List isLoading={isLoadingOrgs}>
        {organizations.length === 0 && !isLoadingOrgs && (
          <List.EmptyView
            icon="🏢"
            title="No Organizations Found"
            description="No organizations found for this API token"
          />
        )}
        {organizations.map((org) => (
          <List.Item
            key={org.id}
            icon="🏢"
            title={org.name}
            subtitle={org.description || "No description"}
            accessories={[
              {
                text: new Date(org.updated_at).toLocaleDateString(),
                tooltip: `Last updated: ${new Date(org.updated_at).toLocaleString()}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select Organization"
                  onAction={async () => {
                    const success = await saveCredentials(org.id);
                    if (success) {
                      fetchServices(preferences.apiToken, org.id);
                    }
                  }}
                />
                <Action
                  title="Back"
                  onAction={() => {
                    setShowOrganizations(false);
                    setOrganizations([]);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  if (showConfig) {
    return (
      <List>
        <List.EmptyView
          icon="🔑"
          title="API Token Required"
          description="Please configure your Qovery API token in the extension preferences"
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={() => {
                  // This will be handled by Raycast's built-in preferences system
                  setShowConfig(false);
                }}
              />
              <Action title="Clear Organization" onAction={clearCredentials} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon="assets/icon.png"
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => fetchServices()} shortcut={{ modifiers: ["cmd"], key: "r" }} />
              <Action
                title="Change Organization"
                onAction={() => {
                  setShowConfig(true);
                  setShowOrganizations(false);
                  setOrganizations([]);
                }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action title="Clear Organization" onAction={clearCredentials} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {services.map((service) => (
        <List.Item
          key={service.id}
          icon={Icon.ArrowRight}
          title={service.name || "Unnamed Service"}
          subtitle={`${service.project_name || "Unknown Project"} • ${service.environment_name || "Unknown Environment"}`}
          actions={
            <ActionPanel>
              {openInQovery(service) && (
                <Action.OpenInBrowser title="Open in Qovery Console" url={openInQovery(service) as string} />
              )}
              <Action
                title="View Service Links"
                icon={Icon.Link}
                onAction={() => fetchServiceLinks(service)}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              <Action.CopyToClipboard title="Copy Project Id to Clipboard" content={service.project_id} />
              <Action.CopyToClipboard title="Copy Environment Id to Clipboard" content={service.environment_id} />
              <Action.CopyToClipboard title="Copy Service Id to Clipboard" content={service.id} />
              <Action.CopyToClipboard title="Copy Service Name" content={service.name} />
              <Action
                title="Refresh Services"
                onAction={() => fetchServices()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Change Organization"
                onAction={() => {
                  setShowConfig(true);
                  setShowOrganizations(false);
                  setOrganizations([]);
                }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action title="Clear Organization" onAction={clearCredentials} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
