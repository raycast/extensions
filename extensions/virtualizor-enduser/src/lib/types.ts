export type CommonResponse = {
  uid: string | -1;
  act: string;
  timezone: string;
  timenow: string;
  vpsid: string | 0;
  username: string | null;
  user_type: string | null;
  preferences: {
    theme: string;
    language: string;
    timezone: string;
    default_enduser_timezone: string;
  },
  url: "index.php?";
  rdns: {
    // pdnsid: null;
  };
  enable_2fa?: 0 | 1;
  disable_recipes: 0 | 1;
  check_licensepro: boolean;
  counts?: {
    vps: string;
    users: string;
    ssh_keys: string;
    api: string;
    euiso: string;
    lb: string;
    recipes: string;
  };
  title: string;
  time_taken: string;
}

type VirtualServer = {
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
      ubc: string;
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
      // "nw_suspended": null,
      rescue: string;
      band_suspend: string;
      tuntap: string;
      ppp: string;
      ploop: string;
      dns_nameserver: string;
      osreinstall_limit: string;
      // "preferences": null,
      nic_type: string;
      vif_type: string;
      virtio: string;
      pv_on_hvm: string;
      // "disks": null,
      kvm_cache: string;
      io_mode: string;
      cpu_mode: string;
      total_iops_sec: string;
      read_bytes_sec: string;
      write_bytes_sec: string;
      kvm_vga: string;
      acceleration: string;
      vnc_keymap: string;
      routing: string;
      mg: string;
      used_bandwidth: string;
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
      // "notes": null,
      disable_nw_config: string;
      locked: string;
      openvz_features: string;
      speed_cap: string;
      numa: string;
      bpid: string;
      bserid: string;
      // "timezone": null,
      ha: string;
      load_balancer: string;
      data: string;
      fwid: string;
      admin_fwid: string;
      // "current_resource": null,
      plan_expiry: string;
      email: string;
      region: string;
      os_distro: string;
      distro: string;
      status: number;
      ips: {
        [key: string]: string;
      }
}

type UserVPSDisk = {
  did: string;
  disk_uuid: string;
  st_uuid: string;
  vps_uuid: string;
  path: string;
  primary: string;
  size: string;
  size_unit: string;
  type: string;
  format: string;
  num: string;
  rescue: string;
  extra: string;
  bus_driver: string;
  bus_driver_num: string;
  user_uid: string;
  disk_name: string;
  mnt_point: string;
  // "project_name": null,
  stid: string;
  vpsid: string;
}

type User = {
    uid: string;
    email: string;
    type: string;
    // aclid: null,
    pid: string;
    uplid: string;
    inhouse_billing: string;
    cur_bal: string;
    cur_usage: string;
    cur_invoices: string;
    max_cost: string;
    num_vs: string;
    num_users: string;
    space: string;
    ram: string;
    burst: string;
    bandwidth: string;
    cpu: string;
    cores: string;
    cpu_percent: string;
    num_cores: string;
    num_ipv4: string;
    num_ip_int: string;
    num_ipv6: string;
    num_ipv6_subnet: string;
    allowed_virts: string;
    network_speed: string;
    upload_speed: string;
    openvz: string;
    xen: string;
    xenhvm: string;
    kvm: string;
    // "sg": null,
    // "mg": null,
    preferences: string;
    dnsplid: string;
    act_status: string;
    activation_code: string;
    date_created: string;
    service_period: string;
    band_suspend: string;
    billing_warn: string | null;
    suspended: string | null;
    foreign_uid: string;
    webuzo_prem_apps: string;
    space_per_vm: string;
    total_iops_sec: string;
    read_bytes_sec: string;
    write_bytes_sec: string;
    // "acl_name": null,
    // "act_cluster_statistics": null,
    // "act_cluster_resources": null,
    // "act_statistics": null,
    // "act_server_statistics": null,
    // "act_vs": null,
    // "act_vsresources": null,
    // "act_editvs": null,
    // "act_suspendvs": null,
    // "act_unsuspendvs": null,
    // "act_deletevs": null,
    // "act_startvs": null,
    // "act_stopvs": null,
    // "act_restartvs": null,
    // "act_poweroffvs": null,
    // "act_addvs": null,
    // "act_rebuildvs": null,
    // "act_vnc": null,
    // "act_migrate": null,
    // "act_ippool": null,
    // "act_editippool": null,
    // "act_deleteippool": null,
    // "act_addippool": null,
    // "act_ips": null,
    // "act_editips": null,
    // "act_deleteips": null,
    // "act_addips": null,
    // "act_servers": null,
    // "act_addserver": null,
    // "act_editserver": null,
    // "act_deleteserver": null,
    // "act_rebootserver": null,
    // "act_sg": null,
    // "act_addsg": null,
    // "act_editsg": null,
    // "act_deletesg": null,
    // "act_vpsbackupsettings": null,
    // "act_restorevpsbackup": null,
    // "act_deletevpsbackup": null,
    // "act_vpsbackups": null,
    // "act_backupservers": null,
    // "act_editbackupservsers": null,
    // "act_addbackupserver": null,
    // "act_deletebackupserver": null,
    // "act_plans": null,
    // "act_addplan": null,
    // "act_editplan": null,
    // "act_deleteplan": null,
    // "act_dnsplans": null,
    // "act_adddnsplan": null,
    // "act_editdnsplan": null,
    // "act_deletednsplan": null,
    // "act_users": null,
    // "act_adduser": null,
    // "act_edituser": null,
    // "act_deleteuser": null,
    // "act_ostemplates": null,
    // "act_edittemplate": null,
    // "act_deletetemplate": null,
    // "act_os": null,
    // "act_addtemplate": null,
    // "act_createtemplate": null,
    // "act_iso": null,
    // "act_addiso": null,
    // "act_editiso": null,
    // "act_deleteiso": null,
    // "act_mg": null,
    // "act_addmg": null,
    // "act_editmg": null,
    // "act_deletemg": null,
    // "act_config": null,
    // "act_emailsettings": null,
    // "act_databackup": null,
    // "act_performdatabackup": null,
    // "act_dldatabackup": null,
    // "act_deletedatabackup": null,
    // "act_adminacl": null,
    // "act_add_admin_acl": null,
    // "act_edit_admin_acl": null,
    // "act_delete_admin_acl": null,
    // "act_serverinfo": null,
    // "act_licenseinfo": null,
    // "act_hostname": null,
    // "act_changehostname": null,
    // "act_maintenance": null,
    // "act_kernconfig": null,
    // "act_defaultvsconf": null,
    // "act_updates": null,
    // "act_emailtemps": null,
    // "act_editemailtemps": null,
    // "act_phpmyadmin": null,
    // "act_pdns": null,
    // "act_addpdns": null,
    // "act_editpdns": null,
    // "act_deletepdns": null,
    // "act_rdns": null,
    // "act_managepdns": null,
    // "act_importvs": null,
    // "act_ssl": null,
    // "act_editssl": null,
    // "act_createssl": null,
    // "act_firewall": null,
    // "act_procs": null,
    // "act_services": null,
    // "act_webserver": null,
    // "act_network": null,
    // "act_sendmail": null,
    // "act_mysqld": null,
    // "act_iptables": null,
    // "act_filemanager": null,
    // "act_ssh": null,
    // "act_logs": null,
    // "act_userlogs": null,
    // "act_loginlogs": null,
    // "act_deletelogs": null,
    // "act_deleteloginlogs": null,
    // "act_deleteuserlogs": null,
    // "act_recipes": null,
    // "act_addrecipe": null,
    // "act_editrecipe": null,
    // "act_iplogs": null,
    // "act_deliplogs": null,
    // "act_list_distros": null,
    // "act_add_distro": null,
    // "act_suspend_user": null,
    // "act_unsuspend_user": null,
    // "act_backup_plans": null,
    // "act_addbackup_plan": null,
    // "act_editbackup_plan": null,
    // "act_deletebackup_plan": null,
    // "act_haproxy": null,
    // "act_twofactauth": null,
    // "act_euiso": null,
    // "act_orphaneddisk": null,
    // "act_deleteorphaneddisk": null,
    // "act_synciso": null,
    // "act_syncostemplate": null,
    // "act_storage": null,
    // "act_addstorage": null,
    // "act_editstorage": null,
    // "act_deletestorage": null,
    // "act_manageserver": null,
    // "act_ha": null,
    // "act_multivirt": null,
    // "act_webuzo": null,
    // "act_billing": null,
    // "act_resource_pricing": null,
    // "act_invoices": null,
    // "act_transactions": null,
    // "act_addinvoice": null,
    // "act_addtransaction": null,
    // "act_add_dnsrecord": null,
    // "act_terminal": null,
    // "act_volumes": null,
    // "act_list_api": null,
    // "act_create_api": null,
    // "act_api_credential_edit": null,
    // "act_show_api_log": null,
    // "act_load_balancer": null,
    // "act_manage_load_balancer": null,
    // "act_sso": null,
    // "act_export_as_csv": null,
    // "act_firewall_plans": null,
    // "act_addfirewall_plan": null,
    // "act_editfirewall_plan": null,
    name: string;
    vps: {
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
      ubc: boolean;
      acpi: string;
      apic: string;
      pae: string;
      shadow: string;
      vnc: string;
      vncport: string;
      vnc_passwd: string;
      hvm: string;
      suspended: "0" | "1";
      // "suspend_reason": null,
      // "nw_suspended": null,
      rescue: string;
      band_suspend: string;
      tuntap: string;
      ppp: string;
      ploop: string;
      dns_nameserver: string;
      osreinstall_limit: string;
      // "preferences": null,
      nic_type: string;
      vif_type: string;
      virtio: string;
      pv_on_hvm: string;
      disks: UserVPSDisk[];
      kvm_cache: string;
      io_mode: string;
      cpu_mode: string;
      total_iops_sec: string;
      read_bytes_sec: string;
      write_bytes_sec: string;
      kvm_vga: string;
      acceleration: string;
      vnc_keymap: string;
      routing: string;
      mg: number[];
      used_bandwidth: string;
      cached_disk: {
        disk: {
          Filesystem: string;
          "1K-blocks": string;
          Used: string;
          Available: string;
          "Use%": string;
          mounted_on: string;
        },
        "inode": {
          Filesystem: string;
          Inodes: string;
          IUsed: string;
          IFree: string;
          "IUse%": string;
          mounted_on: string;
        }
      },
      webuzo: "0" | "1";
      disable_ebtables: "0" | "1";
      install_xentools: "0" | "1";
      admin_managed: "0" | "1";
      rdp: "0" | "1";
      topology_sockets: string;
      topology_cores: string;
      topology_threads: string;
      mac: string;
      // "notes": null,
      disable_nw_config: "0" | "1";
      locked: string;
      openvz_features: string;
      speed_cap: string;
      numa: string;
      bpid: string;
      bserid: string;
      // "timezone": null,
      ha: string;
      load_balancer: string;
      data: {
        os_type: number;
        rtc: number;
        unprivileged: number;
        vnc_auto_port: number;
        nested_virt: number;
        vga_vram: number;
        discard: number;
        vlan_tag: number;
        enable_guest_agent: number;
        ssd_emulation: number;
        machine_type: number;
        bios: string;
        enable_tpm: 0 | 1;
        disable_password: string;
        ssh_options: string;
        added_keys: string[];
        io_uring: number;
        min_ram: number;
        cpu_flags: number;
        scsi_controller: number;
        // demo: null,
        enable_cpu_threshold: number;
        cpu_threshold: number;
        cpu_threshold_time: number;
        disable_guest_agent: number;
        vm_admin_name: string;
        // "crypted_pass": null,
        // "crypted_salt": null
      },
      fwid: string;
      admin_fwid: string;
      // "current_resource": null,
      plan_expiry: string;
      pid: string;
      inhouse_billing: string;
    },
    fname: string;
    lname: string;
}

export type ListVirtualServersResponse = {
    vs: {
        [key: string]: VirtualServer;
    },
  info: {
    flags: {
      enable_idsort: number;
      show_server: number;
      novnc: number;
      // "disable_java_vnc": null,
      disable_recipes: number;
    }
  },
  page: {
    start: number;
    len: number;
    maxNum: number;
  },
  user: User;
  status: {
    [key: string]: number;
  };
}

type Log = {
  actid: string;
  uid: string;
  vpsid: string;
  action: string;
  data: string;
  time: string;
  status: "0" | "1";
  ip: string;
  email: string | null;
  action_text: string;
}
export type LogsResponse = {
  logs: {
    [key: string]: Log;
  }
}

export type Task = {
  actid: string;
  slaveactid: string;
  uid: string;
  vpsid: string;
  serid: number;
  action: string | null;
  data: string;
  time: string;
  status_txt: string;
  status: string;
  progress: string;
  started: string;
  updated: string;
  ended: string;
  proc_id: string;
  ip: string;
  internal: string;
  email: string;
  progress_num: string;
  notupdated_task: number;
  server_name: string;
}

type Page = {
  start: number;
  len: number;
  maxNum: string;
}

export type MessageResponse = {
  done: {
    msg: string;
    goto?: string;
    vpsid: string;
  }
  status?: number;
  output: string;
} & {
  [key: string]: {
    done: 1;
    done_msg: string;
  }
}
export type SuccessResponse<T> = CommonResponse & T;
export type SuccessPaginatedResponse<T> = CommonResponse & T & {page: Page};
export type ErrorResponse = CommonResponse & {
  error: string[];
  status?: number;
  output: null;
};