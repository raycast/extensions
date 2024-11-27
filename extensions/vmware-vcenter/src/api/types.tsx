export interface Server {
  name: string;
  server: string;
  username: string;
  password: string;
}

export interface Vm {
  server: string;
  summary: VMSummary;
  vm_info: VMInfo | undefined;
  interfaces_info: VmGuestNetworkingInterfacesInfo[] | undefined;
  storage_policy_info: VmStoragePolicyInfo | undefined;
  storage_policy_compliance_info: VMStoragePolicyComplianceInfo | undefined;
}

export interface Host {
  server: string;
  summary: HostSummary;
}

export interface Network {
  server: string;
  summary: NetworkSummary;
}

export interface Datastore {
  server: string;
  summary: DatastoreSummary;
}

export interface VMSummary {
  name: string;
  power_state: VmPowerState;
  vm: string;
  cpu_count?: number;
  memory_size_MiB?: number;
}

export interface VMInfo {
  serial_ports: { [key: string]: VmHardwareSerialInfo };
  boot_devices: VmHardwareBootDeviceEntry[];
  cdroms: { [key: string]: VmHardwareCdromInfo };
  cpu: VmHardwareCpuInfo;
  disks: { [key: string]: VmHardwareDiskInfo };
  floppies: { [key: string]: VmHardwareFloppyInfo };
  guest_OS: string;
  hardware: VmHardwareInfo;
  scsi_adapters: { [key: string]: VmHardwareAdapterScsiInfo };
  boot: VmHardwareBootInfo;
  memory: VmHardwareMemoryInfo;
  name: string;
  nics: VmHardwareEthernetInfo;
  parallel_ports: VmHardwareParallelInfo;
  power_state: VmPowerState;
  sata_adapters: { [key: string]: VmHardwareAdapterSataInfo };
  identity?: VmIdentityInfo;
  instant_clone_frozen?: boolean;
}

export interface VmIdentityInfo {
  bios_uuid: string;
  instance_uuid: string;
  name: string;
}

export interface VmHardwareInfo {
  upgrade_policy: VmHardwareUpgradePolicy;
  upgrade_status: VmHardwareUpgradeStatus;
  version: string;
  upgrade_error: { [key: string]: string };
  upgrade_version: string;
}

export interface VmHardwareSerialInfo {
  allow_guest_control: boolean;
  backing: SerialBackingType;
  label: string;
  start_connected: boolean;
  state: VmHardwareConnectionState;
  yield_on_poll: boolean;
}

export interface VmHardwareParallelInfo {
  allow_guest_control: boolean;
  backing: VmHardwareParallelBackingInfo;
  label: string;
  start_connected: boolean;
  state: VmHardwareConnectionState;
}

export interface VmHardwareBootDeviceEntry {
  type: VmHardwareBootDeviceType;
  disks?: string[];
  nic?: string;
}

export interface VmHardwareBootInfo {
  delay: number;
  enter_setup_mode: boolean;
  retry: boolean;
  retry_delay: number;
  type: BootType;
  efi_legacy_protocol?: boolean;
  network_protocol?: BootNetworkProtocol;
}

export interface VmHardwareCdromInfo {
  allow_guest_control: boolean;
  backing: VmHardwareCdromBackingInfo;
  label: string;
  start_connected: boolean;
  state: VmHardwareConnectionState;
  type: VmHardwareCdromHostBusAdapterType;
  ide?: VmHardwareIdeAddressInfo;
  sata?: VmHardwareSataAddressInfo;
}

export interface VmHardwareCdromBackingInfo {
  auto_detect?: boolean;
  device_access_type?: CdromDeviceAccessType;
  host_device?: string;
  iso_file?: string;
  type: CdromBackingType;
}

export interface VmHardwareIdeAddressInfo {
  master: boolean;
  primary: boolean;
}

export interface VmHardwareSataAddressInfo {
  bus: number;
  unit: number;
}

export interface VmHardwareScsiAddressInfo {
  bus: number;
  unit: number;
}

export interface VmHardwareCpuInfo {
  cores_per_socket: number;
  count: number;
  hot_add_enabled: boolean;
  hot_remove_enabled: boolean;
}

export interface VmHardwareMemoryInfo {
  hot_add_enabled: boolean;
  size_MiB: number;
  hot_add_increment_size_MiB: number;
  hot_add_limit_MiB?: number;
}

export interface VmHardwareDiskInfo {
  backing: VmHardwareDiskBackingInfo;
  label: string;
  type: VmHardwareDiskHostBusAdapterType;
  capacity?: number;
  ide?: VmHardwareIdeAddressInfo;
  sata?: VmHardwareSataAddressInfo;
  scsi?: VmHardwareScsiAddressInfo;
}

export interface VmHardwareFloppyInfo {
  allow_guest_control: boolean;
  backing: VmHardwareFloppyBackingInfo;
  label: string;
  start_connected: boolean;
  state: VmHardwareConnectionState;
}

export interface VmHardwareDiskBackingInfo {
  type: VmHardwareDiskBackingType;
  vmdk_file?: string;
}

export interface VmHardwareSerialBackingInfo {
  auto_detect?: boolean;
  file?: string;
  host_device?: string;
  network_location?: string;
  no_rx_loss?: boolean;
  pipe?: string;
  proxy?: string;
}

export interface VmHardwareFloppyBackingInfo {
  auto_detect?: boolean;
  host_device?: string;
  image_file?: string;
  type: VmHardwareFloppyBackingType;
}

export interface VmHardwareEthernetBackingInfo {
  connection_cookie?: number;
  distributed_port?: string;
  distributed_switch_uuid?: string;
  host_device?: string;
  network?: string;
  network_name?: string;
  opaque_network_id?: string;
  opaque_network_type?: string;
  type: VmHardwareEthernetBackingType;
}

export interface VmHardwareParallelBackingInfo {
  auto_detect?: boolean;
  file?: string;
  host_device?: string;
  type: VmHardwareParallelBackingType;
}

export interface VmHardwareAdapterScsiInfo {
  label: string;
  scsi: VmHardwareScsiAddressInfo;
  sharing: VmHardwareAdapterScsiSharing;
  type: VmHardwareAdapterScsiType;
  pci_slot_number?: number;
}

export interface VmHardwareAdapterSataInfo {
  bus: number;
  label: string;
  type: VmHardwareAdapterSataType;
  pci_slot_number?: number;
}

export interface VmHardwareEthernetInfo {
  allow_guest_control: boolean;
  backing: VmHardwareEthernetBackingInfo;
  label: string;
  mac_type: VmHardwareEthernetMacAddressType;
  start_connected: boolean;
  state: VmHardwareConnectionState;
  type: VmHardwareEthernetEmulationType;
  wake_on_lan_enabled: boolean;
  mac_address?: string;
  pci_slot_number?: number;
  upt_compatibility_enabled?: boolean;
}

export interface VmStoragePolicyInfo {
  disks: { [key: string]: string };
  vm_home?: string;
}

export interface VmGuestNetworkingInterfacesInfo {
  dns?: VmGuestDnsConfigInfo;
  dns_values?: VmGuestDnsAssignedValues;
  ip?: VmGuestNetworkingInterfacesIpConfigInfo;
  mac_address?: string;
  nic?: string;
  wins_servers?: string[];
}

export interface VmGuestDnsConfigInfo {
  ip_addresses: string[];
  search_domains: string[];
}

export interface VmGuestDnsAssignedValues {
  domain_name: string;
  host_name: string;
}

export interface VmGuestNetworkingInterfacesIpConfigInfo {
  dhcp?: VmGuestDhcpConfigInfo;
  ip_addresses: VmGuestNetworkingInterfacesIpAddressInfo[];
}

export interface VmGuestDhcpConfigInfo {
  ipv4_enabled: boolean;
  ipv6_enabled: boolean;
}

export interface VmGuestNetworkingInterfacesIpAddressInfo {
  ip_address: string;
  origin?: VmGuestNetworkingInterfacesIpAddressOrigin;
  prefix_length: number;
  state: VmGuestNetworkingInterfacesIpAddressStatus;
}

export interface HostSummary {
  connection_state: HostConnectionState;
  host: string;
  name: string;
  power_state: HostPowerState;
}

export interface NetworkSummary {
  name: string;
  network: string;
  type: NetworkType;
}

export interface NetworkSummary {
  name: string;
  network: string;
  type: NetworkType;
}

export interface DatastoreSummary {
  datastore: string;
  name: string;
  type: DatastoreType;
  capacity?: number;
  free_space?: number;
}

export interface StoragePoliciesSummary {
  description: string;
  name: string;
  policy: string;
}

export interface VMStoragePolicyComplianceInfo {
  disks: { [key: string]: VmStoragePolicyComplianceVmComplianceInfo };
  overall_compliance: VmStoragePolicyComplianceStatus;
  vm_home?: VmStoragePolicyComplianceVmComplianceInfo;
}

export interface VmStoragePolicyComplianceVmComplianceInfo {
  check_time: string;
  failure_cause: StdLocalizableMessage;
  policy?: string;
  status: VmStoragePolicyComplianceStatus;
}

export interface StdLocalizableMessage {
  args: string[];
  default_message: string;
  id: string;
  localized?: string;
  params?: { [key: string]: string };
}

export interface StdLocalizationParam {
  d?: number;
  dt?: string;
  format?: StdLocalizationParamDateTimeFormat;
  i?: number;
  l?: StdNestedLocalizableMessage;
  precision?: number;
}

export interface StdNestedLocalizableMessage {
  id: string;
  params?: { [key: string]: StdLocalizationParam };
}

export interface VmConsoleTicketsCreateSpec {
  type: VmConsoleTicketsType;
}

export interface VmConsoleTicketsSummary {
  ticket: string;
}

export enum VmGuestNetworkingInterfacesIpAddressOrigin {
  OTHER = "OTHER",
  MANUAL = "MANUAL",
  DHCP = "DHCP",
  LINKLAYER = "LINKLAYER",
  RANDOM = "RANDOM",
}

export enum VmGuestNetworkingInterfacesIpAddressStatus {
  PREFERRED = "PREFERRED",
  DEPRECATED = "DEPRECATED",
  INVALID = "INVALID",
  INACCESSIBLE = "INACCESSIBLE",
  UNKNOWN = "UNKNOWN",
  TENTATIVE = "TENTATIVE",
  DUPLICATE = "DUPLICATE",
}

export enum VmStoragePolicyComplianceStatus {
  COMPLIANT = "COMPLIANT",
  NON_COMPLIANT = "NON_COMPLIANT",
  UNKNOWN_COMPLIANCE = "UNKNOWN_COMPLIANCE",
  NOT_APPLICABLE = "NOT_APPLICABLE",
  OUT_OF_DATE = "OUT_OF_DATE",
}

export enum StdLocalizationParamDateTimeFormat {
  SHORT_DATE = "SHORT_DATE",
  MED_DATE = "MED_DATE",
  LONG_DATE = "LONG_DATE",
  FULL_DATE = "FULL_DATE",
  SHORT_TIME = "SHORT_TIME",
  MED_TIME = "MED_TIME",
  LONG_TIME = "LONG_TIME",
  FULL_TIME = "FULL_TIME",
  SHORT_DATE_TIME = "SHORT_DATE_TIME",
  MED_DATE_TIME = "MED_DATE_TIME",
  LONG_DATE_TIME = "LONG_DATE_TIME",
  FULL_DATE_TIME = "FULL_DATE_TIME",
}

export enum VmPowerState {
  POWERED_ON = "POWERED_ON",
  POWERED_OFF = "POWERED_OFF",
  SUSPENDED = "SUSPENDED",
}

export enum SerialBackingType {
  FILE = "FILE",
  HOST_DEVICE = "HOST_DEVICE",
  PIPE_SERVER = "PIPE_SERVER",
  PIPE_CLIENT = "PIPE_CLIENT",
  NETWORK_SERVER = "NETWORK_SERVER",
  NETWORK_CLIENT = "NETWORK_CLIENT",
}

export enum VmHardwareBootDeviceType {
  CDROM = "CDROM",
  DISK = "DISK",
  ETHERNET = "ETHERNET",
  FLOPPY = "FLOPPY",
}

export enum VmHardwareAdapterScsiSharing {
  NONE = "NONE",
  VIRTUAL = "VIRTUAL",
  PHYSICAL = "PHYSICAL",
}

export enum VmHardwareAdapterScsiType {
  BUSLOGIC = "BUSLOGIC",
  LSILOGIC = "LSILOGIC",
  LSILOGICSAS = "LSILOGICSAS",
  PCSCSI = "PCSCSI",
}

export enum VmHardwareAdapterSataType {
  AHCI = "AHCI",
}

export enum HostConnectionState {
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
  NOT_RESPONDING = "NOT_RESPONDING",
}

export enum HostPowerState {
  POWERED_ON = "POWERED_ON",
  POWERED_OFF = "POWERED_OFF",
  STANDBY = "STANDBY",
}

export enum CdromDeviceAccessType {
  EMULATION = "EMULATION",
  PASSTHRU = "PASSTHRU",
  PASSTHRU_EXCLUSIVE = "PASSTHRU_EXCLUSIVE",
}

export enum CdromBackingType {
  ISO_FILE = "ISO_FILE",
  HOST_DEVICE = "HOST_DEVICE",
  CLIENT_DEVICE = "CLIENT_DEVICE",
}

export enum VmHardwareUpgradePolicy {
  NEVER = "NEVER",
  AFTER_CLEAN_SHUTDOWN = "AFTER_CLEAN_SHUTDOWN",
  ALWAYS = "ALWAYS",
}

export enum VmHardwareUpgradeStatus {
  NONE = "NONE",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum VmHardwareDiskBackingType {
  VMDK_FILE = "VMDK_FILE",
}

export enum VmHardwareFloppyBackingType {
  IMAGE_FILE = "IMAGE_FILE",
  HOST_DEVICE = "HOST_DEVICE",
  CLIENT_DEVICE = "CLIENT_DEVICE",
}

export enum VmHardwareEthernetBackingType {
  STANDARD_PORTGROUP = "STANDARD_PORTGROUP",
  HOST_DEVICE = "HOST_DEVICE",
  DISTRIBUTED_PORTGROUP = "DISTRIBUTED_PORTGROUP",
  OPAQUE_NETWORK = "OPAQUE_NETWORK",
}

export enum VmHardwareParallelBackingType {
  FILE = "FILE",
  HOST_DEVICE = "HOST_DEVICE",
}

export enum VmHardwareEthernetMacAddressType {
  MANUAL = "MANUAL",
  GENERATED = "GENERATED",
  ASSIGNED = "ASSIGNED",
}

export enum VmHardwareEthernetEmulationType {
  E1000 = "E1000",
  E1000E = "E1000E",
  PCNET32 = "PCNET32",
  VMXNET = "VMXNET",
  VMXNET2 = "VMXNET2",
  VMXNET3 = "VMXNET3",
}

export enum VmHardwareConnectionState {
  CONNECTED = "CONNECTED",
  RECOVERABLE_ERROR = "RECOVERABLE_ERROR",
  UNRECOVERABLE_ERROR = "UNRECOVERABLE_ERROR",
  NOT_CONNECTED = "NOT_CONNECTED",
  UNKNOWN = "UNKNOWN",
}

export enum VmHardwareCdromHostBusAdapterType {
  IDE = "IDE",
  SATA = "SATA",
}

export enum VmHardwareDiskHostBusAdapterType {
  IDE = "IDE",
  SCSI = "SCSI",
  SATA = "SATA",
}

export enum NetworkType {
  STANDARD_PORTGROUP = "STANDARD_PORTGROUP",
  DISTRIBUTED_PORTGROUP = "DISTRIBUTED_PORTGROUP",
  OPAQUE_NETWORK = "OPAQUE_NETWORK",
}

export enum DatastoreType {
  VMFS = "VMFS",
  NFS = "NFS",
  NFS41 = "NFS41",
  CIFS = "CIFS",
  VSAN = "VSAN",
  VFFS = "VFFS",
  VVOL = "VVOL",
}

export enum BootType {
  BIOS = "BIOS",
  UEFI = "UEFI",
}

export enum BootNetworkProtocol {
  IPV4 = "IPV4",
  IPV6 = "IPV6",
}

export enum VMGuestPowerAction {
  REBOOT = "reboot",
  SHUTDOWN = "shutdown",
  STANDBUY = "standby",
}

export enum VMPowerAction {
  RESET = "reset",
  START = "start",
  STOP = "stop",
  SUSPEND = "suspend",
}

export enum VmConsoleTicketsType {
  VMRC = "VMRC",
  WEBMKS = "WEBMKS",
}
