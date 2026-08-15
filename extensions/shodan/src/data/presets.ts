/**
 * Preset Shodan Queries
 *
 * Queries sourced from:
 * - https://github.com/s-b-repo/advanced-shodan-requests
 * - https://github.com/jakejarvis/awesome-shodan-queries
 *
 * Licensed under Creative Commons Zero v1.0 Universal
 */

import { PresetQuery, PresetCategory } from "../api/types";

export const PRESET_QUERIES: PresetQuery[] = [
  // ============================================
  // Industrial Control Systems
  // ============================================
  {
    id: "ics-samsung-billboards",
    name: "Samsung Electronic Billboards",
    query: '"Server: Prismview Player"',
    description: "Samsung electronic billboard displays",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-gas-pumps",
    name: "Gas Station Pump Controllers",
    query: '"in-tank inventory" port:10001',
    description: "Automated tank gauges at gas stations",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-license-plate-readers",
    name: "Automatic License Plate Readers",
    query: 'P372 "ANPR enabled"',
    description: "ANPR/ALPR cameras for license plate recognition",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-traffic-lights",
    name: "Traffic Light Controllers",
    query: "mikrotik streetlight",
    description: "Traffic light controllers and red light cameras",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-ipv6-cameras",
    name: "IPv6 Cameras",
    query: 'port:554 has_ipv6:true "200 ok"',
    description: "IP cameras accessible via IPv6",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-voting-machines",
    name: "Voting Machines (US)",
    query: '"voter system serial" country:US',
    description: "US voting system serial interfaces",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-lawful-intercept",
    name: "Lawful Intercept Systems",
    query: '"Cisco IOS" "ADVIPSERVICESK9_LI-M"',
    description: "Cisco lawful intercept capable routers",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-prison-phones",
    name: "Prison Pay Phones",
    query: '"[2J[H Encartele Confidential"',
    description: "Prison inmate telephone systems",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-tesla-powerpack",
    name: "Tesla PowerPack Systems",
    query: 'http.title:"Tesla PowerPack System"',
    description: "Tesla PowerPack charging status dashboards",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-ev-chargers",
    name: "Electric Vehicle Chargers",
    query: '"Server: gSOAP/2.8" "Content-Length: 583"',
    description: "Electric vehicle charging stations",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-maritime-satellites",
    name: "Maritime Satellites",
    query: '"Cobham SATCOM" OR ("Sailor" "VSAT")',
    description: "Maritime satellite communication systems",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-modbus",
    name: "Modbus Devices",
    query: "port:502",
    description: "Industrial Modbus protocol devices",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-scada",
    name: "SCADA Systems",
    query: 'tag:"scada"',
    description: "Supervisory control and data acquisition systems",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-s7",
    name: "Siemens S7 PLCs",
    query: "port:102",
    description: "Siemens S7 Programmable Logic Controllers",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-bacnet",
    name: "BACnet Building Automation",
    query: "port:47808",
    description: "Building automation and control networks",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-dicom-xray",
    name: "DICOM Medical X-Ray Machines",
    query: '"DICOM Server Response" port:104',
    description: "Medical imaging devices using DICOM protocol",
    category: "industrial",
    risk: "high",
  },

  // ============================================
  // Network Infrastructure
  // ============================================
  {
    id: "net-weave-scope",
    name: "Weave Scope Dashboards",
    query: 'title:"Weave Scope" http.favicon.hash:567176827',
    description: "Weave Scope container monitoring dashboards",
    category: "network",
    risk: "high",
  },
  {
    id: "net-mongodb-info",
    name: "MongoDB Server Information",
    query: '"MongoDB Server Information" port:27017',
    description: "MongoDB instances exposing server info",
    category: "network",
    risk: "high",
  },
  {
    id: "net-mongo-express",
    name: "Mongo Express Web GUI",
    query: '"Set-Cookie: mongo-express=" "200 OK"',
    description: "MongoDB web administration interface",
    category: "databases",
    risk: "high",
  },
  {
    id: "net-jenkins",
    name: "Jenkins CI Dashboards",
    query: '"X-Jenkins" "Set-Cookie: JSESSIONID"',
    description: "Jenkins CI/CD server dashboards",
    category: "cloud",
    risk: "medium",
  },
  {
    id: "net-docker-api",
    name: "Docker APIs",
    query: '"Docker Containers:" port:2375',
    description: "Exposed Docker daemon APIs",
    category: "cloud",
    risk: "high",
  },
  {
    id: "net-docker-registry",
    name: "Docker Private Registries",
    query: '"Docker-Distribution-Api-Version: registry"',
    description: "Docker private container registries",
    category: "cloud",
    risk: "high",
  },
  {
    id: "net-pihole",
    name: "Pi-hole Open DNS Servers",
    query: '"dnsmasq-pi-hole" "Recursion: enabled"',
    description: "Pi-hole DNS servers with recursion enabled",
    category: "network",
    risk: "medium",
  },
  {
    id: "net-telnet-root",
    name: "Already Logged-In as Root (Telnet)",
    query: '"root@" port:23 -login -password',
    description: "Telnet sessions already logged in as root",
    category: "authentication",
    risk: "high",
  },
  {
    id: "net-android-debug",
    name: "Android Debug Bridge",
    query: '"Android Debug Bridge" "Device" port:5555',
    description: "Exposed Android Debug Bridge (ADB) interfaces",
    category: "network",
    risk: "high",
  },
  {
    id: "net-mikrotik",
    name: "MikroTik Routers",
    query: "port:8291 product:MikroTik",
    description: "MikroTik RouterOS devices",
    category: "network",
    risk: "medium",
  },
  {
    id: "net-ubiquiti",
    name: "Ubiquiti Devices",
    query: 'product:"Ubiquiti"',
    description: "Ubiquiti networking equipment",
    category: "network",
    risk: "low",
  },
  {
    id: "net-fortinet",
    name: "Fortinet Firewalls",
    query: 'product:"FortiGate"',
    description: "Fortinet FortiGate firewalls",
    category: "network",
    risk: "low",
  },

  // ============================================
  // Remote Access & VPN
  // ============================================
  {
    id: "remote-vnc-noauth",
    name: "VNC Without Authentication",
    query: '"authentication disabled" "RFB 003.008"',
    description: "VNC servers with authentication disabled",
    category: "remote",
    risk: "high",
  },
  {
    id: "remote-rdp-windows",
    name: "Windows RDP",
    query: '"\\x03\\x00\\x00\\x0b\\x06\\xd0\\x00\\x00\\x124\\x00"',
    description: "Windows Remote Desktop Protocol endpoints",
    category: "remote",
    risk: "medium",
  },
  {
    id: "remote-ssh",
    name: "SSH Services",
    query: 'port:22 "200 ok"',
    description: "SSH servers responding on port 22",
    category: "remote",
    risk: "low",
  },

  // ============================================
  // Storage & NAS
  // ============================================
  {
    id: "storage-smb-noauth",
    name: "SMB File Shares (No Auth)",
    query: '"Authentication: disabled" port:445',
    description: "SMB shares with authentication disabled",
    category: "storage",
    risk: "high",
  },
  {
    id: "storage-ftp-anonymous",
    name: "Anonymous FTP (Login Successful)",
    query: '"220" "230 Login successful." port:21',
    description: "FTP servers with successful anonymous login",
    category: "storage",
    risk: "high",
  },
  {
    id: "storage-iomega",
    name: "Iomega NAS Devices",
    query: '"Set-Cookie: iomega=" -"manage/login.html"',
    description: "Iomega NAS devices without login page",
    category: "storage",
    risk: "high",
  },
  {
    id: "storage-buffalo",
    name: "Buffalo TeraStation",
    query: "Redirecting sencha port:9000",
    description: "Buffalo TeraStation NAS devices",
    category: "storage",
    risk: "medium",
  },
  {
    id: "storage-logitech-media",
    name: "Logitech Media Server",
    query: '"Server: Logitech Media Server"',
    description: "Logitech media streaming servers",
    category: "storage",
    risk: "low",
  },
  {
    id: "storage-plex",
    name: "Plex Media Servers",
    query: '"X-Plex-Protocol" "200 OK" port:32400',
    description: "Plex media server instances",
    category: "storage",
    risk: "low",
  },
  {
    id: "storage-synology",
    name: "Synology NAS",
    query: 'product:"Synology"',
    description: "Synology network attached storage",
    category: "storage",
    risk: "medium",
  },
  {
    id: "storage-qnap",
    name: "QNAP NAS",
    query: 'product:"QNAP"',
    description: "QNAP network attached storage",
    category: "storage",
    risk: "medium",
  },

  // ============================================
  // Webcams & Surveillance
  // ============================================
  {
    id: "webcam-yawcam",
    name: "Yawcam Webcams",
    query: '"Server: yawcam" "Mime-Type: text/html"',
    description: "Yawcam webcam streaming software",
    category: "webcams",
    risk: "medium",
  },
  {
    id: "webcam-webcamxp",
    name: "WebcamXP/7 Cameras",
    query: '("webcam 7" OR "webcamXP") http.component:"mootools"',
    description: "WebcamXP and Webcam 7 streaming servers",
    category: "webcams",
    risk: "medium",
  },
  {
    id: "webcam-android-ip",
    name: "Android IP Cameras",
    query: '"Server: IP Webcam Server" "200 OK"',
    description: "Android phones as IP cameras",
    category: "webcams",
    risk: "medium",
  },
  {
    id: "webcam-dvr-h264",
    name: "Security DVRs (H264)",
    query: 'html:"DVR_H264 ActiveX"',
    description: "H264 security DVR systems",
    category: "webcams",
    risk: "medium",
  },
  {
    id: "webcam-axis",
    name: "Axis Network Cameras",
    query: 'product:"AXIS" has_screenshot:true',
    description: "Axis network cameras with screenshots",
    category: "webcams",
    risk: "medium",
  },
  {
    id: "webcam-hikvision",
    name: "Hikvision DVRs",
    query: 'product:"Hikvision"',
    description: "Hikvision surveillance systems and DVRs",
    category: "webcams",
    risk: "medium",
  },
  {
    id: "webcam-dahua",
    name: "Dahua Cameras",
    query: 'product:"Dahua"',
    description: "Dahua surveillance cameras and recorders",
    category: "webcams",
    risk: "medium",
  },

  // ============================================
  // Printers & Office Equipment
  // ============================================
  {
    id: "printer-hp",
    name: "HP Printers",
    query: '"Serial Number:" "Built:" "Server: HP HTTP"',
    description: "HP printers with serial numbers exposed",
    category: "printers",
    risk: "low",
  },
  {
    id: "printer-xerox",
    name: "Xerox Devices",
    query: 'ssl:"Xerox Generic Root"',
    description: "Xerox printers and copiers",
    category: "printers",
    risk: "low",
  },
  {
    id: "printer-epson",
    name: "Epson Printers",
    query: '"SERVER: EPSON_Linux UPnP" "200 OK"',
    description: "Epson network printers",
    category: "printers",
    risk: "low",
  },
  {
    id: "printer-canon",
    name: "Canon Printers",
    query: '"Server: KS_HTTP" "200 OK"',
    description: "Canon network printers",
    category: "printers",
    risk: "low",
  },
  {
    id: "printer-jetdirect",
    name: "Network Printers (JetDirect)",
    query: "port:9100 pjl",
    description: "Network printers with JetDirect protocol",
    category: "printers",
    risk: "low",
  },

  // ============================================
  // Home Automation & Consumer Devices
  // ============================================
  {
    id: "home-yamaha",
    name: "Yamaha Stereos",
    query: '"Server: AV_Receiver" "HTTP/1.1 406"',
    description: "Yamaha AV receivers and stereos",
    category: "home",
    risk: "low",
  },
  {
    id: "home-airplay",
    name: "Apple AirPlay Devices",
    query: '"\\x08_airplay" port:5353',
    description: "Apple AirPlay enabled devices",
    category: "home",
    risk: "low",
  },
  {
    id: "home-chromecast",
    name: "Google Chromecasts",
    query: '"Chromecast:" port:8008',
    description: "Google Chromecast devices",
    category: "home",
    risk: "low",
  },
  {
    id: "home-crestron",
    name: "Crestron Controllers",
    query: '"Model: PYNG-HUB"',
    description: "Crestron smart home controllers",
    category: "home",
    risk: "medium",
  },
  {
    id: "home-octoprint",
    name: "OctoPrint 3D Printers",
    query: 'title:"OctoPrint" -title:"Login"',
    description: "OctoPrint 3D printer controllers without login",
    category: "home",
    risk: "medium",
  },
  {
    id: "home-assistant",
    name: "Home Assistant",
    query: 'title:"Home Assistant"',
    description: "Home Assistant smart home platforms",
    category: "home",
    risk: "medium",
  },
  {
    id: "home-smart-tv",
    name: "Smart TVs",
    query: '"webOS TV" OR "Tizen"',
    description: "Smart TV devices exposed online",
    category: "home",
    risk: "low",
  },

  // ============================================
  // Databases
  // ============================================
  {
    id: "db-mongodb-noauth",
    name: "MongoDB (No Auth)",
    query: 'product:"MongoDB" -authentication',
    description: "MongoDB instances potentially without authentication",
    category: "databases",
    risk: "high",
  },
  {
    id: "db-elasticsearch",
    name: "Elasticsearch Clusters",
    query: 'product:"Elasticsearch"',
    description: "Elasticsearch search engine clusters",
    category: "databases",
    risk: "medium",
  },
  {
    id: "db-elastic-kibana",
    name: "Kibana Dashboards",
    query: 'title:"Kibana"',
    description: "Kibana visualization dashboards",
    category: "databases",
    risk: "medium",
  },
  {
    id: "db-redis",
    name: "Redis Servers",
    query: 'product:"Redis"',
    description: "Redis in-memory data stores",
    category: "databases",
    risk: "medium",
  },
  {
    id: "db-mysql",
    name: "MySQL Servers",
    query: "port:3306 mysql",
    description: "MySQL database servers",
    category: "databases",
    risk: "medium",
  },
  {
    id: "db-postgres",
    name: "PostgreSQL Servers",
    query: "port:5432",
    description: "PostgreSQL database servers",
    category: "databases",
    risk: "medium",
  },
  {
    id: "db-couchdb",
    name: "CouchDB Instances",
    query: 'product:"CouchDB"',
    description: "Apache CouchDB document databases",
    category: "databases",
    risk: "medium",
  },
  {
    id: "db-memcached",
    name: "Memcached Servers",
    query: "port:11211 product:Memcached",
    description: "Memcached caching servers",
    category: "databases",
    risk: "medium",
  },
  {
    id: "db-cassandra",
    name: "Cassandra Databases",
    query: 'product:"Cassandra"',
    description: "Apache Cassandra distributed databases",
    category: "databases",
    risk: "medium",
  },

  // ============================================
  // Authentication Issues
  // ============================================
  {
    id: "auth-default-passwords",
    name: "Default Credentials Mentioned",
    query: '"default password"',
    description: "Devices mentioning default passwords in banners",
    category: "authentication",
    risk: "high",
  },
  {
    id: "auth-ftp-anonymous",
    name: "Anonymous FTP",
    query: '"Anonymous user logged in" port:21',
    description: "FTP servers allowing anonymous access",
    category: "authentication",
    risk: "high",
  },
  {
    id: "auth-telnet-no-password",
    name: "Telnet No Password Required",
    query: "port:23 console gateway",
    description: "Telnet services without password prompts",
    category: "authentication",
    risk: "high",
  },

  // ============================================
  // Known Vulnerabilities
  // ============================================
  {
    id: "vuln-heartbleed",
    name: "Heartbleed Vulnerable",
    query: "vuln:CVE-2014-0160",
    description: "Systems vulnerable to Heartbleed (CVE-2014-0160)",
    category: "vulnerabilities",
    risk: "high",
  },
  {
    id: "vuln-eternal-blue",
    name: "EternalBlue Vulnerable",
    query: "vuln:ms17-010",
    description: "Systems vulnerable to EternalBlue/WannaCry",
    category: "vulnerabilities",
    risk: "high",
  },
  {
    id: "vuln-log4j",
    name: "Log4j Vulnerable",
    query: "vuln:CVE-2021-44228",
    description: "Systems potentially vulnerable to Log4Shell",
    category: "vulnerabilities",
    risk: "high",
  },
  {
    id: "vuln-bluekeep",
    name: "BlueKeep RDP Vulnerable",
    query: "vuln:CVE-2019-0708",
    description: "Windows systems vulnerable to BlueKeep RDP exploit",
    category: "vulnerabilities",
    risk: "high",
  },
  {
    id: "vuln-exchange-proxylogon",
    name: "Exchange ProxyLogon",
    query: "vuln:CVE-2021-26855",
    description: "Microsoft Exchange ProxyLogon vulnerability",
    category: "vulnerabilities",
    risk: "high",
  },

  // ============================================
  // Cloud Services
  // ============================================
  {
    id: "cloud-kubernetes",
    name: "Kubernetes API",
    query: "port:6443 kubernetes",
    description: "Exposed Kubernetes API servers",
    category: "cloud",
    risk: "high",
  },
  {
    id: "cloud-gitlab",
    name: "GitLab Instances",
    query: 'title:"GitLab"',
    description: "Self-hosted GitLab instances",
    category: "cloud",
    risk: "medium",
  },
  {
    id: "cloud-grafana",
    name: "Grafana Dashboards",
    query: 'title:"Grafana"',
    description: "Grafana monitoring dashboards",
    category: "cloud",
    risk: "low",
  },
  {
    id: "cloud-prometheus",
    name: "Prometheus Metrics",
    query: 'title:"Prometheus" port:9090',
    description: "Prometheus monitoring servers",
    category: "cloud",
    risk: "medium",
  },
  {
    id: "cloud-sonarqube",
    name: "SonarQube Instances",
    query: 'title:"SonarQube"',
    description: "SonarQube code quality platforms",
    category: "cloud",
    risk: "medium",
  },
  {
    id: "cloud-portainer",
    name: "Portainer Docker UI",
    query: 'title:"Portainer"',
    description: "Portainer Docker management interfaces",
    category: "cloud",
    risk: "medium",
  },
  {
    id: "cloud-rancher",
    name: "Rancher Kubernetes",
    query: 'title:"Rancher"',
    description: "Rancher Kubernetes management platforms",
    category: "cloud",
    risk: "medium",
  },

  // ============================================
  // IoT Devices
  // ============================================
  {
    id: "iot-smart-tv",
    name: "Smart TVs (webOS/Tizen)",
    query: '"webOS TV" OR "Tizen"',
    description: "Smart TV devices exposed online",
    category: "iot",
    risk: "low",
  },

  // ============================================
  // Miscellaneous
  // ============================================
  {
    id: "misc-ethereum-miners",
    name: "Ethereum Miners",
    query: '"ETH - Total speed"',
    description: "Cryptocurrency mining rigs",
    category: "misc",
    risk: "low",
  },
  {
    id: "misc-dir-listing-pem",
    name: "Directory Listings with PEM Files",
    query: 'http.title:"Index of /" http.html:".pem"',
    description: "Directory listings exposing certificate files",
    category: "misc",
    risk: "high",
  },
  {
    id: "misc-wordpress-config",
    name: "WordPress Config Setup",
    query: 'http.html:"* The wp-config.php creation script"',
    description: "WordPress installations in setup mode",
    category: "misc",
    risk: "high",
  },
  {
    id: "misc-minecraft",
    name: "Minecraft Servers",
    query: '"Minecraft Server" "protocol 340"',
    description: "Minecraft game servers",
    category: "misc",
    risk: "low",
  },
  {
    id: "misc-north-korea",
    name: "North Korea Networks",
    query: "net:175.45.176.0/22,210.52.109.0/24",
    description: "IP ranges assigned to North Korea",
    category: "misc",
    risk: "low",
  },
  {
    id: "misc-qotd",
    name: "Quote of the Day Services",
    query: 'port:17 product:"Windows qotd"',
    description: "Windows Quote of the Day services",
    category: "misc",
    risk: "low",
  },
];

export function getPresetsByCategory(category: PresetCategory): PresetQuery[] {
  return PRESET_QUERIES.filter((p) => p.category === category);
}

export function getPresetCategories(): PresetCategory[] {
  return [...new Set(PRESET_QUERIES.map((p) => p.category))];
}

export function getCategoryDisplayName(category: PresetCategory): string {
  const displayNames: Record<PresetCategory, string> = {
    webcams: "Webcams & Surveillance",
    industrial: "Industrial Control Systems",
    databases: "Databases",
    network: "Network Infrastructure",
    authentication: "Authentication Issues",
    vulnerabilities: "Known Vulnerabilities",
    iot: "IoT Devices",
    cloud: "Cloud Services",
    remote: "Remote Access & VPN",
    storage: "Storage & NAS",
    home: "Home Automation",
    printers: "Printers & Office",
    misc: "Miscellaneous",
  };
  return displayNames[category];
}

export function getCategoryIcon(category: PresetCategory): string {
  const icons: Record<PresetCategory, string> = {
    webcams: "video",
    industrial: "building",
    databases: "hard-drive",
    network: "network",
    authentication: "key",
    vulnerabilities: "bug",
    iot: "house",
    cloud: "cloud",
    remote: "desktop",
    storage: "folder",
    home: "house",
    printers: "print",
    misc: "star",
  };
  return icons[category];
}

/**
 * Source Attribution:
 * Queries sourced from:
 * - https://github.com/s-b-repo/advanced-shodan-requests
 * - https://github.com/jakejarvis/awesome-shodan-queries (CC0 1.0)
 */
