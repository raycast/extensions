import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation, confirmAlert } from "@raycast/api";
import { executeGcloudCommand } from "../../../gcloud";
import { ComputeService } from "../ComputeService";
import { NetworkService, Subnet } from "../../network/NetworkService";
import {
  getMachineTypesByFamily,
  imageProjects,
  getImageFamiliesByProject,
  diskTypes,
} from "../../../utils/computeResources";
import { showFailureToast } from "@raycast/utils";

interface CreateVMFormProps {
  projectId: string;
  gcloudPath: string;
  onVMCreated: () => void;
}

interface MachineType {
  name: string;
  description: string;
}

interface ServiceAccountResponse {
  email: string;
  // Add other properties if needed
}

export default function CreateVMForm({ projectId, gcloudPath, onVMCreated }: CreateVMFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zones, setZones] = useState<string[]>([]);
  const [machineTypesByFamily, setMachineTypesByFamily] = useState<{ title: string; types: MachineType[] }[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);
  const [subnetworks, setSubnetworks] = useState<Record<string, Subnet[]>>({});
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedImageProject, setSelectedImageProject] = useState<string>("debian-cloud");
  const [imageFamiliesByProject, setImageFamiliesByProject] = useState<{ name: string; title: string }[]>([]);
  const [serviceAccounts, setServiceAccounts] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({
    machineType: "",
    customCores: "",
    customMemory: "",
  });

  const { pop } = useNavigation();

  // Initialize data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading resources...",
      });

      try {
        const computeService = new ComputeService(gcloudPath, projectId);
        const networkService = new NetworkService(gcloudPath, projectId);

        // Fetch zones - still need to fetch these dynamically as they vary by project
        const zonesList = await computeService.listZones();
        setZones(zonesList);

        // Set default selected zone if available
        if (zonesList.length > 0) {
          setSelectedZone(zonesList[0]);
        }

        // Set machine types from predefined data
        setMachineTypesByFamily(getMachineTypesByFamily());

        // Set initial image families based on default image project
        setImageFamiliesByProject(getImageFamiliesByProject(selectedImageProject));

        // Fetch networks - still need to fetch these dynamically
        const networksList = await fetchNetworks(networkService);
        setNetworks(networksList);

        // Fetch service accounts - still need to fetch these dynamically
        const serviceAccountsList = await fetchServiceAccounts();
        setServiceAccounts(serviceAccountsList);

        setIsLoading(false);
        toast.hide();
      } catch (error: unknown) {
        console.error("Error loading resources:", error);
        toast.hide();
        showFailureToast({
          title: "Failed to load resources",
          message: error instanceof Error ? error.message : "An unknown error occurred",
        });
        // Load with default values instead of failing
        setIsLoading(false);
      }
    };

    loadData();
  }, [gcloudPath, projectId]);

  const fetchNetworks = async (networkService: NetworkService): Promise<string[]> => {
    try {
      // Get VPCs using the NetworkService
      const vpcs = await networkService.getVPCs();
      const networkNames = vpcs.map((vpc) => vpc.name);

      // Fetch subnets for each network
      const subnetworksMap: Record<string, Subnet[]> = {};

      // Get all subnets at once
      const allSubnets = await networkService.getSubnets();

      // Group subnets by network
      for (const vpc of vpcs) {
        // Filter subnets by this VPC
        const vpcSubnets = allSubnets.filter(
          (subnet) => subnet.network.includes(`/${vpc.name}`) || subnet.network === vpc.name,
        );

        subnetworksMap[vpc.name] = vpcSubnets;
      }

      setSubnetworks(subnetworksMap);

      return networkNames.length > 0 ? networkNames : ["default"];
    } catch (error) {
      console.error("Error fetching networks:", error);
      return ["default"];
    }
  };

  const fetchServiceAccounts = async (): Promise<string[]> => {
    try {
      const result = await executeGcloudCommand(gcloudPath, "iam service-accounts list", projectId);
      const serviceAccounts = result as ServiceAccountResponse[];
      return serviceAccounts.map((sa) => sa.email);
    } catch (error) {
      console.error("Error fetching service accounts:", error);
      return [];
    }
  };

  const handleZoneChange = async (newZone: string) => {
    setSelectedZone(newZone);
  };

  const handleNetworkChange = async (newNetwork: string) => {
    setSelectedNetwork(newNetwork);
  };

  const handleImageProjectChange = (project: string) => {
    setSelectedImageProject(project);
    setImageFamiliesByProject(getImageFamiliesByProject(project));
  };

  const handleMachineTypeChange = (value: string) => {
    setFormValues((prev) => ({ ...prev, machineType: value }));
  };

  const handleCustomCoresChange = (value: string) => {
    setFormValues((prev) => ({ ...prev, customCores: value }));
  };

  const handleCustomMemoryChange = (value: string) => {
    setFormValues((prev) => ({ ...prev, customMemory: value }));
  };

  // Helper to format region names
  const formatRegionName = (regionPath: string): string => {
    if (!regionPath) return "";
    // If it's a path like "https://www.googleapis.com/compute/v1/projects/project-id/regions/us-central1"
    // Extract just the region name
    const parts = regionPath.split("/");
    return parts[parts.length - 1];
  };

  const validateName = (name: string) => {
    if (!name) {
      setNameError("Name is required");
      return false;
    }

    if (!/^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
      setNameError(
        "Name must start with a letter, contain only lowercase letters, numbers, and hyphens, and must end with a letter or number",
      );
      return false;
    }

    setNameError(undefined);
    return true;
  };

  const validateCustomMachineType = (values: Record<string, string>): boolean => {
    if (values.machineType !== "custom") {
      return true;
    }

    // Validate cores
    const cores = parseInt(values.customCores || "0", 10);
    if (isNaN(cores) || cores < 1 || cores > 96) {
      showFailureToast({
        title: "Invalid CPU Cores",
        message: "CPU cores must be between 1 and 96",
      });
      return false;
    }

    // Validate memory
    const memory = parseInt(values.customMemory || "0", 10);
    if (isNaN(memory) || memory < 256 || memory % 256 !== 0) {
      showFailureToast({
        title: "Invalid Memory",
        message: "Memory must be a multiple of 256 MiB",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (values: Record<string, string>) => {
    if (!validateName(values.name)) {
      return;
    }

    if (!validateCustomMachineType(values)) {
      return;
    }

    if (values.subnet && values.subnet !== "default" && values.zone) {
      const selectedSubnet = subnetworks[values.network]?.find((s) => s.name === values.subnet);
      if (selectedSubnet) {
        const subnetRegion = formatRegionName(selectedSubnet.region);
        const zoneRegion = values.zone.split("-").slice(0, 2).join("-");

        if (subnetRegion !== zoneRegion) {
          const confirmed = await confirmAlert({
            title: "Region Mismatch",
            message: `The selected subnet "${values.subnet}" is in region "${subnetRegion}" but the VM will be created in zone "${values.zone}" (region "${zoneRegion}"). This may cause the VM creation to fail. Continue anyway?`,
            primaryAction: {
              title: "Continue Anyway",
            },
            dismissAction: {
              title: "Cancel",
            },
          });

          if (!confirmed) {
            return;
          }
        }
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating VM instance...",
      message: values.name,
    });

    try {
      // Sanitize values to prevent null
      const network = values.network === "null" || !values.network ? "default" : values.network;
      const subnet = values.subnet === "null" ? "" : values.subnet;

      // Build the command
      let command = `compute instances create ${values.name} --zone=${values.zone} --machine-type=${values.machineType}`;

      // Add boot disk options
      command += ` --image-project=${values.imageProject} --image-family=${values.imageFamily}`;

      // Add network options
      command += ` --network=${network}`;
      if (subnet) {
        // Use the subnet name directly - gcloud will look for the subnet in the region matching the zone
        command += ` --subnet=${subnet}`;
      }

      // Add public IP option
      if (values.externalIP === "none") {
        command += " --no-address";
      }

      // Add boot disk type
      if (values.bootDiskType) {
        command += ` --boot-disk-type=${values.bootDiskType}`;
      }

      // Add boot disk size
      if (values.bootDiskSize) {
        command += ` --boot-disk-size=${values.bootDiskSize}GB`;
      }

      // Add service account
      if (values.serviceAccount) {
        command += ` --service-account=${values.serviceAccount}`;
      }

      // Add metadata
      if (values.metadata) {
        command += ` --metadata=${values.metadata}`;
      }

      // Add advanced options
      if (advancedMode) {
        // Add tags
        if (values.tags) {
          command += ` --tags=${values.tags}`;
        }

        // Add custom machine type
        if (values.customCores && values.customMemory && values.machineType === "custom") {
          const cores = parseInt(values.customCores, 10);
          const memory = parseInt(values.customMemory, 10);
          command += ` --custom-cpu=${cores} --custom-memory=${memory}`;
        }

        // Add preemptible option
        if (values.preemptible === "true") {
          command += " --preemptible";
        }

        // Add spot option
        if (values.spot === "true") {
          command += " --spot";
        }

        // Add maintenance policy
        if (values.onHostMaintenance) {
          command += ` --maintenance-policy=${values.onHostMaintenance}`;
        }

        // Add disk auto-delete option
        if (values.bootDiskAutoDelete === "false") {
          command += " --no-boot-disk-auto-delete";
        }

        // Add min CPU platform
        if (values.minCpuPlatform) {
          command += ` --min-cpu-platform=${values.minCpuPlatform}`;
        }

        // Add scopes
        if (values.scopes) {
          command += ` --scopes=${values.scopes}`;
        }

        // Add startup script
        if (values.startupScript) {
          command += ` --metadata-from-file startup-script=${values.startupScript}`;
        }

        // Add reservation
        if (values.reservation) {
          command += ` --reservation=${values.reservation}`;
        }
      }

      // Execute the command
      await executeGcloudCommand(gcloudPath, command, projectId, {
        skipCache: true,
        timeout: 120000, // Increase timeout to 120 seconds for VM creation which can take longer
      });

      toast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "VM instance created",
        message: values.name,
      });

      // Call onVMCreated callback to refresh VM instances view
      onVMCreated();

      // Navigate back to the VM instances view
      pop();
    } catch (error: unknown) {
      toast.hide();
      showFailureToast({
        title: "Failed to create VM instance",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create VM Instance"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Vm Instance" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action
            title={advancedMode ? "Simple Mode" : "Advanced Mode"}
            icon={advancedMode ? Icon.List : Icon.Cog}
            onAction={() => setAdvancedMode(!advancedMode)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new Compute Engine virtual machine instance" />

      {/* Basic settings */}
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter instance name"
        info="Must start with a letter, contain only lowercase letters, numbers, and hyphens"
        error={nameError}
        onChange={(value) => validateName(value)}
      />

      <Form.Dropdown id="zone" title="Zone" placeholder="Select a zone" onChange={handleZoneChange}>
        {zones.map((zone) => (
          <Form.Dropdown.Item key={`zone-${zone}`} value={zone} title={zone} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="machineType"
        title="Machine Type"
        placeholder="Select a machine type"
        defaultValue={
          machineTypesByFamily.length > 0 && machineTypesByFamily[0].types.length > 0
            ? machineTypesByFamily[0].types[0].name
            : undefined
        }
        onChange={handleMachineTypeChange}
      >
        {machineTypesByFamily.map((family) => (
          <Form.Dropdown.Section key={family.title} title={family.title}>
            {family.types.map((machineType) => (
              <Form.Dropdown.Item
                key={`mt-${machineType.name}`}
                value={machineType.name}
                title={`${machineType.name} (${machineType.description})`}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
        {advancedMode && <Form.Dropdown.Item key="mt-custom" value="custom" title="Custom" />}
      </Form.Dropdown>

      {advancedMode && (
        <>
          <Form.TextField
            id="customCores"
            title="Custom CPU Cores"
            placeholder="Number of CPU cores (1-96)"
            info="Required for custom machine type"
            error={
              formValues.machineType === "custom" && formValues.customCores
                ? !/^\d+$/.test(formValues.customCores) ||
                  parseInt(formValues.customCores) < 1 ||
                  parseInt(formValues.customCores) > 96
                  ? "CPU cores must be between 1 and 96"
                  : undefined
                : undefined
            }
            onChange={handleCustomCoresChange}
          />

          <Form.TextField
            id="customMemory"
            title="Custom Memory (MiB)"
            placeholder="Memory in MiB (must be multiple of 256)"
            info="Required for custom machine type"
            error={
              formValues.machineType === "custom" && formValues.customMemory
                ? !/^\d+$/.test(formValues.customMemory) ||
                  parseInt(formValues.customMemory) < 256 ||
                  parseInt(formValues.customMemory) % 256 !== 0
                  ? "Memory must be a multiple of 256 MiB"
                  : undefined
                : undefined
            }
            onChange={handleCustomMemoryChange}
          />
        </>
      )}

      {/* Boot Disk Configuration */}
      <Form.Separator />
      <Form.Description title="Boot Disk" text="Configure the boot disk for this instance" />

      <Form.Dropdown
        id="imageProject"
        title="Image Project"
        placeholder="Select an image project"
        defaultValue="debian-cloud"
        onChange={handleImageProjectChange}
      >
        {imageProjects.map((project) => (
          <Form.Dropdown.Item key={`imgp-${project.name}`} value={project.name} title={project.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="imageFamily"
        title="Image Family"
        placeholder="Select an image family"
        defaultValue={imageFamiliesByProject.length > 0 ? imageFamiliesByProject[0].name : undefined}
      >
        {imageFamiliesByProject.map((family) => (
          <Form.Dropdown.Item key={`imgf-${family.name}`} value={family.name} title={family.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="bootDiskType" title="Boot Disk Type" defaultValue="pd-balanced">
        {diskTypes.map((diskType) => (
          <Form.Dropdown.Item key={`disk-${diskType.name}`} value={diskType.name} title={diskType.title} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="bootDiskSize" title="Boot Disk Size (GB)" placeholder="Size in GB" defaultValue="10" />

      {advancedMode && (
        <Form.Dropdown id="bootDiskAutoDelete" title="Auto Delete Boot Disk" defaultValue="true">
          <Form.Dropdown.Item key="delete-true" value="true" title="Yes" />
          <Form.Dropdown.Item key="delete-false" value="false" title="No" />
        </Form.Dropdown>
      )}

      {/* Network settings */}
      <Form.Separator />
      <Form.Description title="Network" text="Configure network settings for this instance" />

      <Form.Dropdown id="network" title="Network" defaultValue="default" onChange={handleNetworkChange}>
        {networks.length > 0 ? (
          networks.map((network) => <Form.Dropdown.Item key={`network-${network}`} value={network} title={network} />)
        ) : (
          <Form.Dropdown.Item key="network-default" value="default" title="default" />
        )}
      </Form.Dropdown>

      <Form.Dropdown
        id="subnet"
        title="Subnetwork"
        placeholder="Select a subnetwork"
        defaultValue={
          selectedNetwork && subnetworks[selectedNetwork]?.length > 0 ? subnetworks[selectedNetwork][0].name : "default"
        }
      >
        {selectedNetwork && subnetworks[selectedNetwork]?.length > 0 ? (
          // First show subnets in the same region as the selected zone for better UX
          subnetworks[selectedNetwork]
            .map((subnet, index) => {
              // Get region from subnet path
              const subnetRegion = formatRegionName(subnet.region);
              // Get selected zone's region
              const zoneRegion = selectedZone ? selectedZone.split("-").slice(0, 2).join("-") : "";
              // Determine if this subnet is in the same region as the selected zone
              const isMatchingRegion = !zoneRegion || subnetRegion === zoneRegion;

              return {
                subnet,
                subnetRegion,
                isMatchingRegion,
                index,
              };
            })
            // Sort by matching region first, then by name
            .sort((a, b) => {
              if (a.isMatchingRegion !== b.isMatchingRegion) {
                return a.isMatchingRegion ? -1 : 1; // Matching regions first
              }
              return a.subnet.name.localeCompare(b.subnet.name); // Then alphabetically
            })
            .map(({ subnet, subnetRegion, isMatchingRegion, index }) => (
              <Form.Dropdown.Item
                key={`subnet-${subnet.name}-${index}`}
                value={subnet.name}
                title={`${subnet.name} (${subnetRegion})${!isMatchingRegion ? " - different region" : ""}`}
                icon={isMatchingRegion ? Icon.Checkmark : Icon.Warning}
              />
            ))
        ) : (
          <Form.Dropdown.Item key="subnet-default-fallback" value="default" title="default" />
        )}
      </Form.Dropdown>

      <Form.Dropdown id="externalIP" title="External IP" defaultValue="auto">
        <Form.Dropdown.Item key="ip-auto" value="auto" title="Automatic (ephemeral)" />
        <Form.Dropdown.Item key="ip-none" value="none" title="None (private instance)" />
      </Form.Dropdown>

      {/* Service Account */}
      <Form.Separator />
      <Form.Description title="Identity" text="Configure identity and access control" />

      <Form.Dropdown
        id="serviceAccount"
        title="Service Account"
        placeholder="Select a service account"
        defaultValue="default"
      >
        <Form.Dropdown.Item key="sa-default" value="default" title="Default compute service account" />
        {serviceAccounts.map((sa) => (
          <Form.Dropdown.Item key={`sa-${sa}`} value={sa} title={sa} />
        ))}
      </Form.Dropdown>

      {advancedMode && (
        <>
          <Form.TextField
            id="scopes"
            title="Access Scopes"
            placeholder="Comma-separated list of scopes"
            info="Example: https://www.googleapis.com/auth/compute,https://www.googleapis.com/auth/devstorage.read_only"
            defaultValue="https://www.googleapis.com/auth/cloud-platform"
          />
        </>
      )}

      {/* Additional settings in advanced mode */}
      {advancedMode && (
        <>
          <Form.Separator />
          <Form.Description title="Additional Settings" text="Configure advanced VM options" />

          <Form.TextField
            id="tags"
            title="Network Tags"
            placeholder="Comma-separated list of tags"
            info="Example: http-server,https-server"
          />

          <Form.TextField
            id="metadata"
            title="Metadata"
            placeholder="Key=value,key=value format"
            info="Example: enable-oslogin=true,serial-port-enable=true"
          />

          <Form.Dropdown id="preemptible" title="Preemptible VM" defaultValue="false">
            <Form.Dropdown.Item key="preempt-false" value="false" title="No" />
            <Form.Dropdown.Item key="preempt-true" value="true" title="Yes" />
          </Form.Dropdown>

          <Form.Dropdown id="spot" title="Spot VM" defaultValue="false">
            <Form.Dropdown.Item key="spot-false" value="false" title="No" />
            <Form.Dropdown.Item key="spot-true" value="true" title="Yes" />
          </Form.Dropdown>

          <Form.Dropdown id="onHostMaintenance" title="On Host Maintenance" defaultValue="MIGRATE">
            <Form.Dropdown.Item key="maint-MIGRATE" value="MIGRATE" title="Migrate VM instance" />
            <Form.Dropdown.Item key="maint-TERMINATE" value="TERMINATE" title="Terminate VM instance" />
          </Form.Dropdown>

          <Form.TextField id="minCpuPlatform" title="Minimum CPU Platform" placeholder="Example: Intel Cascade Lake" />

          <Form.TextField
            id="startupScript"
            title="Startup Script File Path"
            placeholder="Local file path to startup script"
          />

          <Form.TextField
            id="reservation"
            title="Reservation"
            placeholder="Reservation name"
            info="Specific reservation to use for this VM"
          />
        </>
      )}
    </Form>
  );
}
