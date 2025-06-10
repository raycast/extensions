import { VMInfo } from "../api/types";

export type InputVmList = {
  /**
   * HTTP URL query parameter string.
   *
   * Query Parameters:
   *
   * names - Optional - String of Array
   * Names that virtual machines must have to match the filter.
   * If unset or empty, virtual machines with any name match the filter.
   *
   * folders - Optional - String of Array
   * Folders that must contain the virtual machine for the virtual machine to
   * match the filter. If unset or empty, virtual machines in any folder match
   * the filter. When clients pass a value of this structure as a parameter,
   * the field must contain identifiers for the resource type: Folder. When
   * operations return a value of this structure as a result, the field will
   * contain identifiers for the resource type: Folder.
   *
   * datacenters - Optional - String of Array
   * Hosts that must contain the virtual machine for the virtual machine to
   * match the filter. If unset or empty, virtual machines on any host match
   * the filter. When clients pass a value of this structure as a parameter,
   * the field must contain identifiers for the resource type: HostSystem.
   * When operations return a value of this structure as a result, the field
   * will contain identifiers for the resource type: HostSystem.
   *
   * clusters - Optional - String of Array
   * Clusters that must contain the virtual machine for the virtual machine
   * to match the filter. If unset or empty, virtual machines in any cluster
   * match the filter. When clients pass a value of this structure as a
   * parameter, the field must contain identifiers for the resource type:
   * ClusterComputeResource. When operations return a value of this structure
   * as a result, the field will contain identifiers for the resource type:
   * ClusterComputeResource.
   *
   * resource_pools - Optional - String of Array
   * Resource pools that must contain the virtual machine for the virtual
   * machine to match the filter. If unset or empty, virtual machines in
   * any resource pool match the filter. When clients pass a value of this
   * structure as a parameter, the field must contain identifiers for the
   * resource type: ResourcePool. When operations return a value of this
   * structure as a result, the field will contain identifiers for the
   * resource type: ResourcePool.
   *
   * power_states - Optional - Vm_Power_State of Array
   * Power states that a virtual machine must be in to match the filter.
   * If unset or empty, virtual machines in any
   * power state match the filter.
   *
   * Note:
   *
   * Array values are passed appending multiple parameters, example: names=VM1&names=VM2.
   *
   * Custom Types:
   *
   * Vm_Power_State - Enumeration - POWERED_OFF, POWERED_ON, SUSPENDED
   * The Power.State enumerated type defines the valid power states for a virtual machine.
   * POWERED_OFF : The virtual machine is powered off.
   * POWERED_ON : The virtual machine is powered on.
   * SUSPENDED : The virtual machine is suspended.
   *
   */
  searchParams?: string;
};

export type InputVmId = {
  /* vCenter Server Identifier */
  vcenterId: string;
  /* Virtual Machine Identifier matching this regexp vm-[0-9]+ */
  vmId: string;
};

export type InputVmIds = {
  /* Array of VM */
  vm: InputVmId[];
};

export interface OutputVmInfo extends InputVmId {
  info?: VMInfo;
}

export type InputVmGuestTasks = {
  /* Guest Power Tasks Array */
  tasks: {
    /* Virtual Machine */
    vm: InputVmId;
    /**
     * Guest Power Action. Can only be one of this value: reboot, shutdown or standby.
     */
    action: "reboot" | "shutdown" | "standby";
  }[];
};

export type InputVmPowerTasks = {
  /* Power Tasks Array */
  tasks: {
    /* Virtual Machine */
    vm: InputVmId;
    /**
     * Power Action. Can only be one of this value: "reset", "start", "stop" or "suspend".
     */
    action: "reset" | "start" | "stop" | "suspend";
  }[];
};
