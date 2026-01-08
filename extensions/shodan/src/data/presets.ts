/**
 * Preset Shodan Queries
 *
 * Many queries sourced from:
 * https://github.com/jakejarvis/awesome-shodan-queries
 *
 * Licensed under Creative Commons Zero v1.0 Universal
 */

import { PresetQuery, PresetCategory } from "../api/types";

export const PRESET_QUERIES: PresetQuery[] = [
  // ============================================
  // Industrial Control Systems
  // From: https://github.com/jakejarvis/awesome-shodan-queries
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
    id: "ics-tesla-powerpack",
    name: "Tesla PowerPack Systems",
    query: 'http.title:"Tesla PowerPack System" http.component:"d3"',
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
    id: "ics-submarine-control",
    name: "Submarine Mission Control",
    query: 'title:"Slocum Fleet Mission Control"',
    description: "Submarine/underwater glider mission dashboards",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-refrigeration",
    name: "CAREL Refrigeration Units",
    query: '"Server: CarelDataServer" "200 Document follows"',
    description: "CAREL PlantVisor refrigeration control systems",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-wind-turbines",
    name: "Nordex Wind Turbine Farms",
    query: 'http.title:"Nordex Control"',
    description: "Nordex wind turbine control systems",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-gps-trackers",
    name: "C4 Max Vehicle GPS Trackers",
    query: '"[1m[35mWelcome on console"',
    description: "Commercial vehicle GPS tracking systems",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-dicom-xray",
    name: "DICOM Medical X-Ray Machines",
    query: '"DICOM Server Response" port:104',
    description: "Medical imaging devices using DICOM protocol",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-electricity-meters",
    name: "GaugeTech Electricity Meters",
    query: '"Server: EIG Embedded Web Server" "200 Document follows"',
    description: "Industrial electricity monitoring meters",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-siemens-automation",
    name: "Siemens Industrial Automation",
    query: '"Siemens, SIMATIC" port:161',
    description: "Siemens SIMATIC industrial automation systems",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-siemens-hvac",
    name: "Siemens HVAC Controllers",
    query: '"Server: Microsoft-WinCE" "Content-Length: 12581"',
    description: "Siemens building HVAC control systems",
    category: "industrial",
    risk: "medium",
  },
  {
    id: "ics-door-locks",
    name: "Door/Lock Access Controllers",
    query: '"HID VertX" port:4070',
    description: "HID VertX door access control systems",
    category: "industrial",
    risk: "high",
  },
  {
    id: "ics-railroad",
    name: "Railroad Management Systems",
    query: '"log off" "select the appropriate"',
    description: "Railroad management interfaces",
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

  // ============================================
  // Remote Desktop
  // ============================================
  {
    id: "rdp-vnc-noauth",
    name: "VNC Without Authentication",
    query: '"authentication disabled" "RFB 003.008"',
    description: "VNC servers with authentication disabled",
    category: "authentication",
    risk: "high",
  },
  {
    id: "rdp-windows",
    name: "Windows RDP",
    query: '"\\x03\\x00\\x00\\x0b\\x06\\xd0\\x00\\x00\\x124\\x00"',
    description: "Windows Remote Desktop Protocol endpoints",
    category: "network",
    risk: "medium",
  },

  // ============================================
  // Network Infrastructure
  // From: https://github.com/jakejarvis/awesome-shodan-queries
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
    query: '"X-Jenkins" "Set-Cookie: JSESSIONID" http.title:"Dashboard"',
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
    query: '"Docker-Distribution-Api-Version: registry" "200 OK" -gitlab',
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
    query: '"root@" port:23 -login -password -name -Session',
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
    id: "net-lantronix",
    name: "Lantronix Serial-to-Ethernet",
    query: "Lantronix password port:30718 -secured",
    description: "Lantronix serial-to-ethernet adapters",
    category: "network",
    risk: "high",
  },
  {
    id: "net-citrix",
    name: "Citrix Virtual Apps",
    query: '"Citrix Applications:" port:1604',
    description: "Citrix virtual application servers",
    category: "network",
    risk: "medium",
  },
  {
    id: "net-cisco-smart-install",
    name: "Cisco Smart Install",
    query: '"smart install client active"',
    description: "Cisco devices with Smart Install active",
    category: "network",
    risk: "high",
  },
  {
    id: "net-pbx-gateway",
    name: "PBX IP Phone Gateways",
    query: 'PBX "gateway console" -password port:23',
    description: "PBX phone system gateways",
    category: "network",
    risk: "medium",
  },
  {
    id: "net-polycom-video",
    name: "Polycom Video Conferencing",
    query: 'http.title:"- Polycom" "Server: lighttpd"',
    description: "Polycom video conferencing systems",
    category: "network",
    risk: "medium",
  },
  {
    id: "net-bomgar",
    name: "Bomgar Help Desk Portal",
    query: '"Server: Bomgar" "200 OK"',
    description: "Bomgar remote support portals",
    category: "network",
    risk: "medium",
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
  // Webcams & Cameras
  // ============================================
  {
    id: "webcam-axis",
    name: "Axis Network Cameras",
    query: 'product:"AXIS" has_screenshot:true',
    description: "Axis network cameras with screenshots available",
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
    query: 'title:"webcamXP" OR title:"webcam 7"',
    description: "WebcamXP and Webcam 7 streaming servers",
    category: "webcams",
    risk: "medium",
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
    description: "Kibana visualization dashboards for Elasticsearch",
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
  // IoT Devices
  // ============================================
  {
    id: "iot-home-assistant",
    name: "Home Assistant",
    query: 'title:"Home Assistant"',
    description: "Home Assistant smart home platforms",
    category: "iot",
    risk: "medium",
  },
  {
    id: "iot-printer",
    name: "Network Printers",
    query: "port:9100 pjl",
    description: "Network printers with JetDirect",
    category: "iot",
    risk: "low",
  },
  {
    id: "iot-nas",
    name: "NAS Devices",
    query: 'product:"Synology" OR product:"QNAP"',
    description: "Network attached storage devices",
    category: "iot",
    risk: "medium",
  },
  {
    id: "iot-smart-tv",
    name: "Smart TVs",
    query: '"webOS TV" OR "Tizen"',
    description: "Smart TV devices exposed online",
    category: "iot",
    risk: "low",
  },
  {
    id: "iot-hp-printers",
    name: "HP Printers",
    query: '"HP-ChaiSOE" port:80',
    description: "HP printers with web interface",
    category: "iot",
    risk: "low",
  },
  {
    id: "iot-canon-printers",
    name: "Canon Printers",
    query: '"Server: CANON HTTP Server"',
    description: "Canon network printers",
    category: "iot",
    risk: "low",
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
];

export function getPresetsByCategory(category: PresetCategory): PresetQuery[] {
  return PRESET_QUERIES.filter((p) => p.category === category);
}

export function getPresetCategories(): PresetCategory[] {
  return [...new Set(PRESET_QUERIES.map((p) => p.category))];
}

export function getCategoryDisplayName(category: PresetCategory): string {
  const displayNames: Record<PresetCategory, string> = {
    webcams: "Webcams & Cameras",
    industrial: "Industrial Control Systems",
    databases: "Databases",
    network: "Network Infrastructure",
    authentication: "Authentication Issues",
    vulnerabilities: "Known Vulnerabilities",
    iot: "IoT Devices",
    cloud: "Cloud Services",
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
  };
  return icons[category];
}

/**
 * Source Attribution:
 * Many queries in this file are sourced from the awesome-shodan-queries repository
 * by Jake Jarvis: https://github.com/jakejarvis/awesome-shodan-queries
 *
 * The repository is licensed under Creative Commons Zero v1.0 Universal (CC0 1.0)
 * which allows for free use, modification, and distribution.
 */
