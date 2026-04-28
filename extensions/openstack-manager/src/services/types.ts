/**
 * Data types for OpenStack resources as returned by the openstack CLI
 * in JSON format (`-f json`).
 */

/** Nova compute instance (virtual machine). */
export interface Server {
  id: string;
  name: string;
  status: string;
  flavor: string;
  image: string;
  networks: string;
  security_groups?: string;
  availability_zone?: string;
  key_name?: string | null;
  created?: string;
  updated?: string;
}

/** Nova hardware profile defining vCPU, RAM, and disk for a Server. */
export interface Flavor {
  id: string;
  name: string;
  vcpus?: number;
  ram?: number; // MB
  disk?: number; // GB
  ephemeral?: number;
  swap?: string;
  rxtx_factor?: number;
  is_public?: boolean;
}

/** Glance disk image used to boot a Server. */
export interface Image {
  id: string;
  name: string;
  status: string;
  disk_format?: string;
  container_format?: string;
  size?: number | null; // bytes
  min_disk?: number;
  min_ram?: number;
  visibility?: string;
  owner?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
}

/** Neutron virtual network. */
export interface Network {
  id: string;
  name: string;
  status?: string;
  admin_state_up?: boolean;
  shared?: boolean;
  router_external?: boolean;
  subnets?: string[];
  provider_network_type?: string;
  provider_segmentation_id?: number;
}

/** Neutron security group. */
export interface SecurityGroup {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  project_name?: string;
  security_group_rules?: SecurityGroupRule[];
}

/** A single rule within a SecurityGroup. */
export interface SecurityGroupRule {
  id: string;
  direction: "ingress" | "egress";
  protocol: string | null;
  port_range_min: number | null;
  port_range_max: number | null;
  remote_ip_prefix: string | null;
  remote_group_id: string | null;
  ethertype: "IPv4" | "IPv6";
}

/** Magnum Kubernetes cluster. */
export interface MagnumCluster {
  uuid: string;
  name: string;
  status: string;
  status_reason?: string | null;
  cluster_template_id?: string;
  master_count?: number;
  node_count?: number;
  keypair?: string | null;
  api_address?: string | null;
  discovery_url?: string | null;
  created_at?: string;
  updated_at?: string | null;
  labels?: Record<string, string>;
  coe_version?: string | null;
}
