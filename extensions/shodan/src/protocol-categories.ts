// Protocol categorization utility for Shodan on-demand scanning
// This file groups protocols from the protocols.json file into logical categories

export interface ProtocolCategory {
  name: string;
  description: string;
  protocols: Array<{
    name: string;
    description: string;
    port?: number;
    protocol?: string;
  }>;
  icon: string;
}

// Common service mappings for quick selection
export const COMMON_SERVICES = [
  { name: "HTTP", port: 80, protocol: "http" },
  { name: "HTTPS", port: 443, protocol: "https" },
  { name: "SSH", port: 22, protocol: "ssh" },
  { name: "FTP", port: 21, protocol: "ftp" },
  { name: "SMTP", port: 25, protocol: "smtp" },
  { name: "DNS", port: 53, protocol: "dns-udp" },
  { name: "Telnet", port: 23, protocol: "telnet" },
  { name: "RDP", port: 3389, protocol: "rdp" },
  { name: "VNC", port: 5900, protocol: "vnc" },
  { name: "Git", port: 9418, protocol: "git" },
  { name: "RTSP", port: 554, protocol: "rtsp-tcp" },
  { name: "SMB", port: 445, protocol: "smb" },
  { name: "NFS", port: 2049, protocol: "nfs" },
  { name: "SNMP", port: 161, protocol: "snmp" },
  { name: "LDAP", port: 389, protocol: "ldap-tcp" },
  { name: "IMAP", port: 143, protocol: "imap" },
  { name: "POP3", port: 110, protocol: "pop3" },
  { name: "IMAPS", port: 993, protocol: "imap-ssl" },
  { name: "POP3S", port: 995, protocol: "pop3-ssl" },
];

// Protocol categories based on the protocols.json file
export const PROTOCOL_CATEGORIES: ProtocolCategory[] = [
  {
    name: "Web Services",
    description: "HTTP, HTTPS, and web-related protocols",
    icon: "🌐",
    protocols: [
      { name: "http", description: "HTTP banner grabbing module" },
      { name: "https", description: "HTTPS banner grabbing module" },
      { name: "http-simple-new", description: "HTTP banner grabber only (no robots, sitemap etc.)" },
      { name: "https-simple-new", description: "HTTPS banner grabber only (no robots, sitemap etc.)" },
      { name: "quic", description: "Checks whether a service supports the QUIC HTTP protocol" },
      { name: "couchdb", description: "HTTP banner grabbing module" },
      { name: "consul", description: "Determine wether consul is running & collect relevant info" },
      { name: "vault", description: "Determine wether vault is running & collect relevant info" },
    ],
  },
  {
    name: "Databases",
    description: "Database servers and management systems",
    icon: "🗄️",
    protocols: [
      { name: "mysql", description: "Grabs the metadata of the running MySQL server" },
      { name: "postgresql", description: "Collects system information from the PostgreSQL daemon" },
      { name: "mongodb", description: "Collects system information from the MongoDB daemon." },
      { name: "redis", description: "Redis banner grabbing module" },
      { name: "memcache", description: "Get general information about the Memcache daemon" },
      { name: "memcache-udp", description: "Get general information about the Memcache daemon responding on UDP" },
      { name: "cassandra", description: "Get cluster information for the Cassandra database software." },
      { name: "riak", description: "Sends a ServerInfo request to Riak" },
      { name: "rethinkdb", description: "Detect rethinkdb running database" },
      { name: "voldemort", description: "Pings the Voldemort database." },
      { name: "skytable", description: "Detects Skytable servers by sending client handshake." },
      { name: "foundationdb", description: "Try to grab data from FoundationDB servers" },
      { name: "h2-database", description: "Pings an H2 Database server" },
      { name: "ms-sql", description: "Check whether the MS-SQL database server is running" },
      { name: "ms-sql-monitor", description: "Pings an MS-SQL Monitor server" },
      { name: "oracle-tns", description: "Check whether the Oracle TNS Listener is running." },
      { name: "ibm-db2-das", description: "Grab basic information about the IBM DB2 Database Server." },
      { name: "ibm-db2-drda", description: "Checks for support of the IBM DB2 DRDA protocol." },
      { name: "firebird", description: "Detect Firebird rdbms running host" },
      { name: "membase", description: "send probe request to membase server then parse stats" },
    ],
  },
  {
    name: "Cameras & Video",
    description: "Security cameras, video streaming, and surveillance systems",
    icon: "📹",
    protocols: [
      { name: "rtsp-tcp", description: "Determine which options the RTSP server allows." },
      { name: "dahua-dvr", description: "Grab the serial number from a Dahua DVR device." },
      { name: "onvif", description: "Check whether the Onvif camera is operating." },
      { name: "camera-p2p-server", description: "Detect iLnkP2P/CS2 Network P2P Servers" },
      { name: "xiaongmai-backdoor", description: "Detect backdoor in xiaongmai devices." },
    ],
  },
  {
    name: "Industrial & IoT",
    description: "Industrial control systems, IoT devices, and embedded systems",
    icon: "🏭",
    protocols: [
      { name: "modbus", description: "Grab the Modbus device information via functions 17 and 43." },
      { name: "s7", description: "Communicate using the S7 protocol and grab the device identifications." },
      { name: "bacnet", description: "Gets various information from a BACnet device." },
      { name: "ethernetip", description: "Grab information from a device supporting EtherNet/IP over TCP" },
      { name: "ethernetip-udp", description: "Grab information from a device supporting EtherNet/IP over UDP" },
      { name: "iec-104", description: "Banner grabber for the IEC-104 protocol." },
      { name: "iec-61850", description: "MMS protocol" },
      { name: "dnp3", description: "A dump of data from a DNP3 outstation" },
      { name: "hart-ip-udp", description: "Checks whether the IP is a HART-IP gateway." },
      { name: "codesys", description: "Grab a banner for Codesys daemons" },
      { name: "proconos", description: "Gets information about the PLC via the ProConOs protocol." },
      { name: "pcworx", description: "Gets information about PC Worx device." },
      { name: "melsec-q-tcp", description: "Get the CPU information from a Mitsubishi Electric Q Series PLC." },
      { name: "melsec-q-udp", description: "Get the CPU information from a Mitsubishi Electric Q Series PLC." },
      { name: "omron-tcp", description: "Gets information about the Omron PLC." },
      { name: "unitronics-pcom", description: "Collects device information for Unitronics PLCs via PCOM protocol." },
      { name: "lsv2", description: "Try to grab data from LSV2 protocol" },
      { name: "scpi", description: "Check for the SCPI protocol used by lab equipment" },
      { name: "knx", description: "Grabs the description from a KNX service." },
      { name: "upnp", description: "Collects device information via UPnP." },
      { name: "mdns", description: "Perform a DNS-based service discovery over multicast DNS" },
    ],
  },
  {
    name: "Network Services",
    description: "Core network protocols and services",
    icon: "🌐",
    protocols: [
      { name: "ssh", description: "Get the SSH banner, its host key and fingerprint" },
      { name: "ftp", description: "Grab the FTP banner" },
      { name: "smtp", description: "Get basic SMTP server response" },
      { name: "smtps", description: "Grab a banner and certificate for SMTPS servers" },
      { name: "dns-tcp", description: "Try to determine the version of a DNS server by grabbing version.bind" },
      { name: "dns-udp", description: "Try to determine the version of a DNS server by grabbing version.bind" },
      { name: "telnet", description: "Telnet banner grabbing module" },
      { name: "telnets", description: "Telnet wrapped in SSL banner grabbing module" },
      { name: "ldap-tcp", description: "LDAP banner grabbing module" },
      { name: "ldap-udp", description: "CLDAP banner grabbing module" },
      { name: "ldaps", description: "LDAPS banner grabbing module" },
      { name: "imap", description: "Get the welcome message of the IMAP server" },
      { name: "imap-ssl", description: "Get the welcome message of the secure IMAP server" },
      { name: "pop3", description: "Grab the POP3 welcome message" },
      { name: "pop3-ssl", description: "Grab the secure POP3 welcome message" },
      { name: "nntp", description: "Get the welcome message of a Network News server" },
      { name: "ntp", description: "Get a list of IPs that NTP server recently saw and try to get version info." },
      { name: "snmp", description: "SNMP banner grabbing module" },
      { name: "bgp", description: "Checks whether the device is running BGP." },
      { name: "rip", description: "Checks whether the device is running the Routing Information Protocol." },
      { name: "ospf", description: "Checks whether the device is running OSPF." },
    ],
  },
  {
    name: "Remote Access",
    description: "Remote desktop, VNC, and remote management protocols",
    icon: "🖥️",
    protocols: [
      { name: "rdp", description: "RDP banner grabbing module" },
      { name: "rdpeudp", description: "(Experimental) Pings RDP services over UDP" },
      { name: "vnc", description: "VNC banner grabbing module" },
      { name: "teamviewer", description: "Determine whether a server is running TeamViewer" },
      { name: "radmin", description: "Connection request to an Radmin server" },
      { name: "pcanywhere-status", description: "Asks the PC Anywhere status daemon for basic information." },
      { name: "nomachine", description: "Detect nomachine nx server" },
      { name: "teradici-pcoip", description: "Check whether the device is running Teradici PCoIP Management Console." },
      {
        name: "teradici-pcoip-old",
        description: "Check whether the device is running Teradici PCoIP Management Console.",
      },
      { name: "openvpn", description: "Checks whether the other server runs an OpenVPN that doesnt require TLS auth" },
      { name: "pptp", description: "Connect via PPTP" },
      { name: "l2tp", description: "Checks whether the device is running the Layer 2 Transport Protocol service." },
      { name: "ike", description: "Checks whether a device is running a VPN using IKE." },
      { name: "ike-nat-t", description: "Checks whether a device is running a VPN using IKE and NAT traversal." },
    ],
  },
  {
    name: "Gaming & Entertainment",
    description: "Gaming servers, streaming services, and entertainment platforms",
    icon: "🎮",
    protocols: [
      { name: "minecraft", description: "Gets the server status information from a Minecraft server" },
      { name: "minecraft-bedrock", description: "Get status information from a Minecraft server running Bedrock" },
      { name: "steam-a2s", description: "Collect information about Steam game servers using the A2S protocol." },
      {
        name: "steam-dedicated-server-rcon",
        description:
          "Checks whether an IP is running as a Steam dedicated game server with remote authentication enabled.",
      },
      { name: "steam-ihs", description: "Steam In-Home Streaming protocol" },
      { name: "satisfactory-udp", description: "Check Satisfactory server status" },
      { name: "playstation", description: "Check Playstation 4/5 consoles" },
      { name: "xbox", description: "Check Xbox consoles." },
      { name: "tibia", description: "Grab general information from Open Tibia servers" },
      { name: "ventrilo", description: "Gets the detailed status information from a Ventrilo server." },
      { name: "mumble-server", description: "Grabs the version information for the Murmur service (Mumble server)" },
      { name: "spotify-connect", description: "Get info from spotify-connect services" },
      { name: "squeeze_center", description: "Detect Logitech SqueezeCenter music server" },
    ],
  },
  {
    name: "Cryptocurrency",
    description: "Cryptocurrency nodes and blockchain services",
    icon: "₿",
    protocols: [
      {
        name: "bitcoin",
        description: "Grabs information about a Bitcoin daemon, including any devices connected to it.",
      },
      { name: "dogecoin-node", description: "Check if a device is a Dogecoin node and extract relevant information." },
      { name: "litecoin-node", description: "Check if a device is a Litecoin node and extract relevant information." },
      { name: "ethereum-p2p", description: "Grabs information about the Ethereum discovery protocol." },
      { name: "ethereum-rpc", description: "Grabs version information about the Ethereum node." },
      { name: "monero-rpc", description: "Collect information about the Monero daemon." },
      { name: "iota-rpc", description: "Grabs version information about the IOTA node." },
      { name: "ripple-rtxp", description: "Grabs the list of peers from an RTXP Ripple daemon." },
    ],
  },
  {
    name: "Security & Monitoring",
    description: "Security tools, monitoring systems, and threat detection",
    icon: "🔒",
    protocols: [
      { name: "clamav", description: "Determine whether a server is running ClamAV" },
      { name: "tor-control", description: "Checks whether a device is running the Tor control service." },
      { name: "tor-versions", description: "Checks whether the device is running the Tor OR protocol." },
      { name: "socks5-proxy", description: "Detect SOCKS5 proxy server" },
      { name: "stun", description: "STUN banner module" },
      { name: "natpmp", description: "Checks whether NAT-PMP is exposed on the device." },
      { name: "upnp", description: "Collects device information via UPnP." },
      { name: "statsd-admin", description: "Gathers statistics from the StatsD service." },
      { name: "munin", description: "Check whether a Munin node is active and list its plugins" },
      { name: "rdate", description: "Get the time from a remote rdate server" },
    ],
  },
  {
    name: "Printers & Peripherals",
    description: "Printers, scanners, and peripheral devices",
    icon: "🖨️",
    protocols: [
      {
        name: "line-printer-daemon",
        description: "Get a list of jobs in the print queue to verify the device is a printer.",
      },
      { name: "printer-job-language", description: "Get the current output from the status display on a printer" },
      { name: "handpunch", description: "Discover biometric hand scanners using HandPunch protocol" },
      { name: "hddtemp", description: "View hard disk information from hddtemp service." },
    ],
  },
  {
    name: "Smart Home & IoT",
    description: "Smart home devices, IoT sensors, and connected appliances",
    icon: "🏠",
    protocols: [
      { name: "flux-led", description: "Grab the current state from a Flux LED light bulb." },
      { name: "tp-link-kasa", description: "Ping TP-Link Kasa devices" },
      { name: "tp-link-kasa-new", description: "Ping TP-Link Kasa devices (new protocol)" },
      { name: "tuya", description: "Check whether a device supports the Tuya API" },
      { name: "xiaomi-miio", description: "Ping Xiaomi devices" },
      { name: "broadlink", description: "Ping Broadlink devices" },
      { name: "smarter-coffee", description: "Checks the device status of smart coffee machines." },
      { name: "ikettle", description: "Check whether the device is a coffee machine/ kettle." },
      { name: "lifx", description: "Check whether there is a BitTorrnt tracker running." },
      { name: "hifly", description: "Checks whether the HiFly lighting control is running." },
      { name: "spotify-connect", description: "Get info from spotify-connect services" },
    ],
  },
  {
    name: "Messaging & Communication",
    description: "Chat servers, messaging protocols, and communication systems",
    icon: "💬",
    protocols: [
      { name: "irc", description: "Internet Relay Server for real-time chat" },
      { name: "xmpp", description: "Sends a hello request to the XMPP daemon" },
      { name: "sip", description: "Gets the options that the SIP device supports." },
      { name: "mumble-server", description: "Grabs the version information for the Murmur service (Mumble server)" },
      { name: "ventrilo", description: "Gets the detailed status information from a Ventrilo server." },
    ],
  },
  {
    name: "File Sharing & Storage",
    description: "File sharing protocols, storage systems, and backup services",
    icon: "📁",
    protocols: [
      { name: "smb", description: "Grab a list of shares exposed through the Server Message Block service" },
      { name: "nfs", description: "NFS banner grabbing module" },
      { name: "rsync", description: "Get a list of shares from the rsync daemon." },
      { name: "ftp", description: "Grab the FTP banner" },
      { name: "sftp", description: "SFTP banner grabbing module" },
      { name: "afp", description: "AFP server information grabbing module" },
    ],
  },
  {
    name: "Development & Tools",
    description: "Development tools, version control, and build systems",
    icon: "🛠️",
    protocols: [
      { name: "git", description: "Check whether git is running." },
      { name: "language-server-protocol", description: "Checks whether the port is running a language server." },
      { name: "java-rmi", description: "Check whether the device is running Java RMI." },
      { name: "weblogic", description: "Detects WebLogic servers with T3 protocol support and version information." },
      { name: "tomcat", description: "Check whether the Tomcat server running AJP protocol" },
      { name: "apache-dubbo", description: "Apache Dubbo unauthenticated access were detected." },
    ],
  },
];

// Helper function to get all protocols from a category
export function getProtocolsFromCategory(categoryName: string): Array<{ name: string; description: string }> {
  const category = PROTOCOL_CATEGORIES.find((cat) => cat.name === categoryName);
  return category ? category.protocols : [];
}

// Helper function to get all category names
export function getCategoryNames(): string[] {
  return PROTOCOL_CATEGORIES.map((cat) => cat.name);
}

// Helper function to find a protocol by name
export function findProtocolByName(protocolName: string): { name: string; description: string } | null {
  for (const category of PROTOCOL_CATEGORIES) {
    const protocol = category.protocols.find((p) => p.name === protocolName);
    if (protocol) {
      return protocol;
    }
  }
  return null;
}

// Helper function to get common services with their port mappings
export function getCommonServicesWithPorts(): Array<{ name: string; port: number; protocol: string }> {
  return COMMON_SERVICES;
}
