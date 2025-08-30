import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Form,
  LocalStorage,
  Icon,
} from "@raycast/api";

export default function Command() {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [showOrganizations, setShowOrganizations] = useState(false);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceLinks, setServiceLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);

  useEffect(() => {
    loadStoredCredentials();
  }, []);

  const loadStoredCredentials = async () => {
    try {
      const storedApiToken = await LocalStorage.getItem("qovery_api_token");
      const storedOrgId = await LocalStorage.getItem("qovery_organization_id");

      if (storedApiToken && storedOrgId) {
        setApiToken(storedApiToken);
        setOrganizationId(storedOrgId);
        fetchServices(storedApiToken, storedOrgId);
      } else {
        setShowConfig(true);
        setIsLoading(false);
      }
    } catch (err) {
      setShowConfig(true);
      setIsLoading(false);
    }
  };

  const fetchOrganizations = async (token) => {
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

      const data = await response.json();
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
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
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

  const saveCredentials = async (token, orgId) => {
    try {
      await LocalStorage.setItem("qovery_api_token", token);
      await LocalStorage.setItem("qovery_organization_id", orgId);
      setApiToken(token);
      setOrganizationId(orgId);
      setShowConfig(false);
      setShowOrganizations(false);
      return true;
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to save credentials",
      });
      return false;
    }
  };

  const fetchServices = async (token = apiToken, orgId = organizationId) => {
    if (!token || !orgId) {
      setError("API Token and Organization ID are required.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.qovery.com/organization/${orgId}/services`,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API token. Please check your credentials.");
        } else if (response.status === 404) {
          throw new Error(
            "Organization not found. Please check your organization ID.",
          );
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();
      setServices(data.results || []);

      if (data.results && data.results.length === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "No services found",
          message: "No services found in this organization.",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
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

  const openInQovery = (service) => {
    if (
      !service ||
      !service.project_id ||
      !service.environment_id ||
      !service.id
    ) {
      return null;
    }

    const serviceType = service.service_type?.toLowerCase() || "application";
    const url = `https://console.qovery.com/organization/${organizationId}/project/${service.project_id}/environment/${service.environment_id}/${serviceType}/${service.id}/general`;
    return url;
  };

  const fetchServiceLinks = async (service) => {
    if (
      !service ||
      !service.id ||
      !service.project_id ||
      !service.environment_id
    ) {
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
          Authorization: `Token ${apiToken}`,
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

      const data = await response.json();
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
          message: `Found ${data.results.length} link(s)`,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
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
      await LocalStorage.removeItem("qovery_api_token");
      await LocalStorage.removeItem("qovery_organization_id");
      setApiToken("");
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
        title: "Credentials cleared",
        message: "Please enter new credentials",
      });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to clear credentials",
      });
    }
  };

  if (showLinks) {
    return (
      <List isLoading={isLoadingLinks}>
        <List.Section title={`Links for ${selectedService?.name || "Service"}`}>
          {serviceLinks.length === 0 && !isLoadingLinks && (
            <List.EmptyView
              icon="🔗"
              title="No Links Found"
              description="This service has no configured links"
            />
          )}
          {serviceLinks.map((link, index) => (
            <List.Item
              key={index}
              icon={Icon.Link}
              title={link.url}
              actions={
                <ActionPanel>
                  {link.url && (
                    <Action.OpenInBrowser title="Open Link" url={link.url} />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Link URL"
                    content={link.url || ""}
                  />
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
                    const success = await saveCredentials(apiToken, org.id);
                    if (success) {
                      fetchServices(apiToken, org.id);
                    }
                  }}
                />
                <Action
                  title="Back to Token Input"
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
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Fetch Organizations"
              onSubmit={async (values) => {
                setApiToken(values.apiToken);
                fetchOrganizations(values.apiToken);
              }}
            />
            <Action
              title="Clear Stored Credentials"
              onAction={clearCredentials}
              style={Action.Style.Destructive}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="apiToken"
          title="Qovery API Token"
          placeholder="Enter your Qovery API token"
          value={apiToken}
          onChange={setApiToken}
        />
      </Form>
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
              <Action
                title="Retry"
                onAction={() => fetchServices()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Change Credentials"
                onAction={() => {
                  setShowConfig(true);
                  setShowOrganizations(false);
                  setOrganizations([]);
                }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Clear Credentials"
                onAction={clearCredentials}
                style={Action.Style.Destructive}
              />
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
                <Action.OpenInBrowser
                  title="Open in Qovery Console"
                  url={openInQovery(service)}
                />
              )}
              <Action
                title="View Service Links"
                icon={Icon.Link}
                onAction={() => fetchServiceLinks(service)}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              <Action.CopyToClipboard
                title="Copy Project ID"
                content={service.project_id}
              />
              <Action.CopyToClipboard
                title="Copy Environment ID"
                content={service.environment_id}
              />
              <Action.CopyToClipboard
                title="Copy Service ID"
                content={service.id}
              />
              <Action.CopyToClipboard
                title="Copy Service Name"
                content={service.name}
              />
              <Action
                title="Refresh Services"
                onAction={() => fetchServices()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Change Credentials"
                onAction={() => {
                  setShowConfig(true);
                  setShowOrganizations(false);
                  setOrganizations([]);
                }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Clear Credentials"
                onAction={clearCredentials}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
