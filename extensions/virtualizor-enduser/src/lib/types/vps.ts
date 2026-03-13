import { User, UserData, UserVPSDisk } from "./user";

export type BaseVirtualServer = {
  vpsid: string;
  vps_name: string;
  uuid: string;
  serid: string;
  time: string;
  edittime: string;
  virt: string;
  uid: string;
  plid: string;
  hostname: string;
  osid: string;
  os_name: string;
  iso: string;
  sec_iso: string;
  boot: string;
  space: string;
  inodes: string;
  ram: string;
  burst: string;
  swap: string;
  cpu: string;
  cores: string;
  cpupin: string;
  cpu_percent: string;
  bandwidth: string;
  network_speed: string;
  upload_speed: string;
  io: string;
  ubc: string | boolean;
  acpi: string;
  apic: string;
  pae: string;
  shadow: string;
  vnc: string;
  vncport: string;
  vnc_passwd: string;
  hvm: string;
  suspended: string;
  suspend_reason: string | null;
  nw_suspended: null;
  rescue: string;
  band_suspend: string;
  tuntap: string;
  ppp: string;
  ploop: string;
  dns_nameserver: string;
  osreinstall_limit: string;
  preferences: null;
  nic_type: string;
  vif_type: string;
  virtio: string;
  pv_on_hvm: string;
  disks: null | UserVPSDisk[];
  mg: string | number[];
  used_bandwidth: string;
};
type VirtualServer = BaseVirtualServer & {
  ubc: string;
  disks: null;
  mg: string;
  cached_disk: string;
  webuzo: string;
  disable_ebtables: string;
  install_xentools: string;
  admin_managed: string;
  rdp: string;
  topology_sockets: string;
  topology_cores: string;
  topology_threads: string;
  mac: string;
  notes: null;
  disable_nw_config: string;
  locked: string;
  openvz_features: string;
  speed_cap: string;
  numa: string;
  bpid: string;
  bserid: string;
  timezone: null;
  ha: string;
  load_balancer: string;
  data: string;
  fwid: string;
  admin_fwid: string;
  current_resource: null;
  plan_expiry: string;
  email: string;
  region: string;
  os_distro: string;
  distro: string;
  status: number;
  ips: {
    [ip: string]: string;
  };
};

export type VirtualServersInfoResponse = {
  info: {
    os: {
      osid: string;
      type: string;
      name: string;
      filename: string;
      size: string;
      pygrub: "0";
      drive: "";
      hvm: "0";
      perf_ops: "1";
      active: "0" | "1";
      url: string;
      distro: string;
      Nvirt: "kvm";
      mg: number[];
      distro_logo: string;
    };
    hostname: string;
    status: 0 | 1;
    uptime: boolean;
    bandwidth: {
      limit: number;
      used: number;
      usage: {
        [date: string]: number;
      };
      in: {
        [date: string]: number;
      };
      out: {
        [date: string]: number;
      };
      free: number;
      limit_gb: number;
      used_gb: number;
      free_gb: number;
      percent: number;
      percent_free: number;
      yr_bandwidth: {
        [month in "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11"]: {
          in: number;
          out: number;
          vpsid: string;
          date: string;
        };
      };
    };
    ip: string[];
    ip_count: number;
    bw_cal_config: number;
    vps: Omit<VirtualServer, "email" | "region" | "os_distro" | "distro" | "status" | "ips"> & {
      disks: UserVPSDisk[];
      mg: number[];
      cached_disk: {
        disk: {
          Filesystem: string;
          "1K": string;
          Used: string;
          Available: string;
          Use: string;
          mounted_on: string;
        };
        inode: {
          Filesystem: string;
          Inodes: string;
          IUsed: string;
          IFree: string;
          IUse: string;
          mounted_on: string;
        };
      };
      data: UserData;
    };
    virt: "kvm";
    vpsid: string;
    flags: {
      disable_icons_cp: 0 | 1;
      disable_recipes: 0 | 1;
      disable_backup_cp: 0 | 1;
      has_backuply: 0 | 1;
      disable_icons_monitor: 0 | 1;
      rescue_mode: 0 | 1;
      disable_change_hostname: 0 | 1;
      disable_change_password: 0 | 1;
      disable_change_vnc_password: 0 | 1;
      disable_vps_config: 0 | 1;
      disable_os_reinstall: 0 | 1;
      disable_ssh: 0 | 1;
      disable_self_shutdown: 0 | 1;
      disable_server_location: 0 | 1;
      enable_rdns: 0 | 1;
      haproxy: 0 | 1;
      services_support: 0 | 1;
      proc_support: 0 | 1;
      disable_enduser_sshkeys: 0 | 1;
      disable_domain_forward: 0 | 1;
      show_vps_active_time: 0 | 1;
      power_only_option: 0 | 1;
      disable_logs: 0 | 1;
      disable_change_primary_ip: 0 | 1;
      hide_enduser_vnc_info: 0 | 1;
      disk_caching: 0 | 1;
      hvmsettings: 0 | 1;
      enable_console: 0 | 1;
      ipv6_subnets: 0 | 1;
      map_address: {
        country_code: string;
        state: string;
        city: string;
      };
      iso_support: 0 | 1;
      bpid: string;
    };
    "2fa_type": string;
    last_login: string;
  };
  available: string[];
};

export type ListVirtualServersResponse = {
  vs: {
    [key: string]: VirtualServer;
  };
  info: {
    flags: {
      enable_idsort: number;
      show_server: number;
      novnc: number;
      // "disable_java_vnc": null,
      disable_recipes: number;
    };
  };
  page: {
    start: number;
    len: number;
    maxNum: number;
  };
  user: User;
  status: {
    [key: string]: number;
  };
};
