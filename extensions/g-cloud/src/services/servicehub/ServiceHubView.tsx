import { useState, useEffect, useMemo } from "react";
import { List, ActionPanel, Action, Icon, Toast, showToast, Color, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ServiceHubService, GCPService } from "./ServiceHubService";
import ServiceDetails from "./components/ServiceDetails";
import { GCPServiceCategory } from "../../utils/gcpServices";

export interface ViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function ServiceHubView({ projectId, gcloudPath }: ViewProps) {
  const [services, setServices] = useState<GCPService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);
  const [showCoreServicesOnly, setShowCoreServicesOnly] = useState(false);
  const { push } = useNavigation();

  const serviceHubService = new ServiceHubService(gcloudPath, projectId);

  const categories = useMemo(() => {
    if (!services) return [];
    const allCategories = services
      .map((service) => service.category || "Other")
      .filter((category) => category !== undefined && category !== null)
      .filter((value, index, self) => self.indexOf(value) === index);
    return allCategories.sort();
  }, [services]);

  useEffect(() => {
    fetchServices();
  }, []);

  function viewServiceDetails(service: GCPService) {
    push(
      <ServiceDetails
        service={service}
        serviceHub={serviceHubService}
        onServiceStatusChange={() => fetchServices(false)}
      />,
    );
  }

  async function fetchServices(showToasts = true) {
    setIsLoading(true);
    setError(null);

    if (showToasts) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Loading services...",
        message: `Project: ${projectId}`,
      });
    }

    try {
      const fetchedServices = await serviceHubService.listServices();
      setServices(fetchedServices);

      if (showToasts) {
        showToast({
          style: Toast.Style.Success,
          title: "Services loaded",
          message: `${fetchedServices.length} services found`,
        });
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);

      if (showToasts) {
        showFailureToast(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshServices() {
    setIsRefreshing(true);

    await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing services...",
      message: `Project: ${projectId}`,
    });

    try {
      const refreshedServices = await serviceHubService.listServices({ useLocalOnly: false });
      setServices(refreshedServices);

      showToast({
        style: Toast.Style.Success,
        title: "Services refreshed",
        message: `${refreshedServices.length} services found`,
      });
    } catch (error) {
      console.error("Error refreshing services:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      showFailureToast(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function enableService(service: GCPService) {
    setIsLoading(true);

    const enablingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Enabling service...",
      message: service.displayName || service.name,
    });

    try {
      await serviceHubService.enableService(service.name);

      const updatedServices = services.map((s) => {
        if (s.name === service.name) {
          return { ...s, isEnabled: true };
        }
        return s;
      });

      setServices(updatedServices);

      enablingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Service enabled",
        message: service.displayName || service.name,
      });
    } catch (error) {
      console.error("Error enabling service:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      enablingToast.hide();
      showFailureToast({
        title: "Failed to enable service",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function disableService(service: GCPService) {
    setIsLoading(true);

    const disablingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Disabling service...",
      message: service.displayName || service.name,
    });

    try {
      await serviceHubService.disableService(service.name);

      const updatedServices = services.map((s) => {
        if (s.name === service.name) {
          return { ...s, isEnabled: false };
        }
        return s;
      });

      setServices(updatedServices);

      disablingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Service disabled",
        message: service.displayName || service.name,
      });
    } catch (error) {
      console.error("Error disabling service:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      disablingToast.hide();
      showFailureToast({
        title: "Failed to disable service",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredServices = useMemo(() => {
    let result = [...services];

    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      result = result.filter(
        (service) =>
          service.name.toLowerCase().includes(lowerSearchText) ||
          (service.displayName && service.displayName.toLowerCase().includes(lowerSearchText)) ||
          (service.description && service.description.toLowerCase().includes(lowerSearchText)) ||
          (service.category && service.category.toLowerCase().includes(lowerSearchText)),
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((service) => service.category === selectedCategory);
    }

    if (showOnlyEnabled) {
      result = result.filter((service) => service.isEnabled);
    }

    if (showCoreServicesOnly) {
      const coreServices = [
        "compute.googleapis.com",
        "storage.googleapis.com",
        "iam.googleapis.com",
        "container.googleapis.com",
        "run.googleapis.com",
        "cloudfunctions.googleapis.com",
        "bigquery.googleapis.com",
        "sqladmin.googleapis.com",
        "firestore.googleapis.com",
        "datastore.googleapis.com",
        // Add other core services as needed
      ];
      result = result.filter((service) => coreServices.includes(service.name));
    }

    return result;
  }, [services, searchText, selectedCategory, showOnlyEnabled, showCoreServicesOnly]);

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load services"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={fetchServices} icon={Icon.RotateClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  function getServiceIcon(service: GCPService) {
    const category = service.category || GCPServiceCategory.OTHER;

    switch (category) {
      case GCPServiceCategory.COMPUTE:
        return Icon.Desktop;
      case GCPServiceCategory.STORAGE:
        return Icon.HardDrive;
      case GCPServiceCategory.DATABASE:
        return Icon.List;
      case GCPServiceCategory.NETWORKING:
        return Icon.Globe;
      case GCPServiceCategory.SECURITY:
        return Icon.Lock;
      case GCPServiceCategory.ANALYTICS:
        return Icon.BarChart;
      case GCPServiceCategory.AI_ML:
        return Icon.LightBulb;
      case GCPServiceCategory.DEVOPS:
        return Icon.Hammer;
      case GCPServiceCategory.MANAGEMENT:
        return Icon.Gear;
      case GCPServiceCategory.SERVERLESS:
        return Icon.Cloud;
      default:
        return Icon.Circle;
    }
  }

  return (
    <List
      isLoading={isLoading || isRefreshing}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search services..."
      navigationTitle={`GCP Services - ${projectId}`}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Refresh Services"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshServices}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter options"
          onChange={(value) => {
            if (value === "all") {
              setSelectedCategory("all");
            } else if (value.startsWith("category:")) {
              setSelectedCategory(value.replace("category:", ""));
            } else if (value === "status:enabled") {
              setShowOnlyEnabled(true);
            } else if (value === "status:all") {
              setShowOnlyEnabled(false);
            } else if (value === "core:true") {
              setShowCoreServicesOnly(true);
            } else if (value === "core:false") {
              setShowCoreServicesOnly(false);
            }
          }}
        >
          <List.Dropdown.Section title="Project">
            <List.Dropdown.Item title={`Current: ${projectId}`} value="current_project" icon={{ source: Icon.Box }} />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Categories">
            <List.Dropdown.Item title="All Categories" value="all" icon={Icon.List} />
            {categories.map((category) => (
              <List.Dropdown.Item key={category} title={category} value={`category:${category}`} />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="All Services" value="status:all" />
            <List.Dropdown.Item title="Enabled Services" value="status:enabled" />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Service Type">
            <List.Dropdown.Item title="Core Services Only" value="core:true" />
            <List.Dropdown.Item title="All Services" value="core:false" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="Services">
        {filteredServices.map((service) => (
          <List.Item
            key={service.name}
            title={service.displayName || service.name}
            subtitle={service.description ? service.description.split(".")[0] : ""}
            icon={{
              source: getServiceIcon(service),
              tintColor: service.isEnabled ? Color.Blue : Color.SecondaryText,
            }}
            accessories={[
              service.isEnabled
                ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Enabled" }
                : { icon: { source: Icon.Circle, tintColor: Color.SecondaryText }, tooltip: "Not Enabled" },
              { tag: service.category || "Other" },
              service.region && service.region !== "global" ? { text: service.region } : { text: "" },
            ]}
            actions={
              <ActionPanel>
                <Action title="View Details" icon={Icon.Sidebar} onAction={() => viewServiceDetails(service)} />
                <Action
                  title={service.isEnabled ? "Disable Service" : "Enable Service"}
                  icon={service.isEnabled ? Icon.XmarkCircle : Icon.CheckCircle}
                  onAction={() => (service.isEnabled ? disableService(service) : enableService(service))}
                />
                <Action
                  title="Refresh Services"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refreshServices}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
