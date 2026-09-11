/**
 * Complete list of official Shodan search filters
 * Source: https://www.shodan.io/search/filters
 */

export interface ShodanFilter {
  name: string;
  description: string;
  example: string;
  suggestions?: string[];
  type: "text" | "number" | "country" | "port" | "boolean";
}

export const SHODAN_FILTERS: ShodanFilter[] = [
  {
    name: "after",
    description: "Only show results after the given date (dd/mm/yyyy)",
    example: "apache after:01/01/2023",
    type: "text",
  },
  {
    name: "asn",
    description: "Autonomous system number",
    example: "asn:AS15169",
    type: "text",
    suggestions: ["AS15169", "AS8075", "AS14618", "AS16509", "AS13335"],
  },
  {
    name: "before",
    description: "Only show results before the given date (dd/mm/yyyy)",
    example: "apache before:31/12/2023",
    type: "text",
  },
  {
    name: "city",
    description: "Name of the city",
    example: 'city:"New York"',
    type: "text",
    suggestions: [
      "New York",
      "London",
      "Tokyo",
      "Singapore",
      "Moscow",
      "Berlin",
      "Paris",
    ],
  },
  {
    name: "country",
    description: "2-letter country code",
    example: "country:US",
    type: "country",
    suggestions: ["US", "CN", "DE", "GB", "JP", "RU", "FR", "NL", "KR", "IN"],
  },
  {
    name: "geo",
    description:
      "Accepts between 2-4 parameters: latitude, longitude, radius (km), and optional country code",
    example: "geo:40.7128,-74.0060,50",
    type: "text",
  },
  {
    name: "hash",
    description: "Hash of the banner data",
    example: "hash:123456789",
    type: "text",
  },
  {
    name: "has_ipv6",
    description: "True/False - whether the device has IPv6",
    example: "has_ipv6:true",
    type: "boolean",
    suggestions: ["true", "false"],
  },
  {
    name: "has_screenshot",
    description: "True/False - whether the device has a screenshot",
    example: "has_screenshot:true",
    type: "boolean",
    suggestions: ["true", "false"],
  },
  {
    name: "hostname",
    description: "Full host name for the device",
    example: "hostname:example.com",
    type: "text",
  },
  {
    name: "ip",
    description: "Specific IP address or CIDR range",
    example: "ip:8.8.8.8",
    type: "text",
  },
  {
    name: "isp",
    description: "Internet Service Provider",
    example: 'isp:"Google"',
    type: "text",
    suggestions: [
      "Google",
      "Amazon",
      "Microsoft",
      "Cloudflare",
      "Digital Ocean",
      "Hetzner",
    ],
  },
  {
    name: "link",
    description: "Network link type",
    example: "link:ethernet",
    type: "text",
    suggestions: ["ethernet", "cellular", "satellite"],
  },
  {
    name: "net",
    description: "Network range in CIDR notation",
    example: "net:8.8.8.0/24",
    type: "text",
  },
  {
    name: "org",
    description: "Organization name",
    example: 'org:"Google"',
    type: "text",
    suggestions: [
      "Google",
      "Amazon",
      "Microsoft",
      "Facebook",
      "Apple",
      "Cloudflare",
    ],
  },
  {
    name: "os",
    description: "Operating system",
    example: "os:Windows",
    type: "text",
    suggestions: [
      "Windows",
      "Linux",
      "Unix",
      "FreeBSD",
      "Mac OS",
      "Cisco IOS",
      "Ubuntu",
    ],
  },
  {
    name: "port",
    description: "Port number",
    example: "port:80",
    type: "port",
    suggestions: [
      "80",
      "443",
      "22",
      "21",
      "23",
      "3389",
      "8080",
      "8443",
      "3306",
      "5432",
    ],
  },
  {
    name: "postal",
    description: "Postal code",
    example: "postal:10001",
    type: "text",
  },
  {
    name: "product",
    description: "Software/product name",
    example: "product:Apache",
    type: "text",
    suggestions: [
      "Apache",
      "nginx",
      "Microsoft IIS",
      "OpenSSH",
      "MySQL",
      "PostgreSQL",
      "MongoDB",
    ],
  },
  {
    name: "region",
    description: "State/region name",
    example: "region:California",
    type: "text",
    suggestions: ["California", "Texas", "New York", "Florida", "Virginia"],
  },
  {
    name: "state",
    description: "State/region name (alias for region)",
    example: "state:California",
    type: "text",
    suggestions: ["California", "Texas", "New York", "Florida", "Virginia"],
  },
  {
    name: "version",
    description: "Software version",
    example: "product:Apache version:2.4",
    type: "text",
  },
  {
    name: "vuln",
    description: "CVE ID for known vulnerability",
    example: "vuln:CVE-2014-0160",
    type: "text",
    suggestions: [
      "CVE-2014-0160",
      "CVE-2021-44228",
      "CVE-2017-0144",
      "CVE-2019-0708",
    ],
  },
];

// Common port names for autocomplete
export const COMMON_PORTS: Record<string, string> = {
  "21": "FTP",
  "22": "SSH",
  "23": "Telnet",
  "25": "SMTP",
  "53": "DNS",
  "80": "HTTP",
  "110": "POP3",
  "143": "IMAP",
  "443": "HTTPS",
  "445": "SMB",
  "3306": "MySQL",
  "3389": "RDP",
  "5432": "PostgreSQL",
  "5900": "VNC",
  "6379": "Redis",
  "8080": "HTTP Proxy",
  "8443": "HTTPS Alt",
  "9200": "Elasticsearch",
  "27017": "MongoDB",
};

// Common products for autocomplete
export const COMMON_PRODUCTS = [
  "Apache",
  "nginx",
  "Microsoft IIS",
  "OpenSSH",
  "MySQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Docker",
  "Kubernetes",
  "Jenkins",
  "GitLab",
  "WordPress",
  "Tomcat",
];

// Common CVEs for autocomplete
export const COMMON_CVES = [
  "CVE-2014-0160", // Heartbleed
  "CVE-2021-44228", // Log4Shell
  "CVE-2017-0144", // EternalBlue
  "CVE-2019-0708", // BlueKeep
  "CVE-2020-1472", // Zerologon
  "CVE-2021-26855", // ProxyLogon
  "CVE-2022-30190", // Follina
];

// Country codes with names
export const COUNTRY_CODES: Record<string, string> = {
  US: "United States",
  CN: "China",
  DE: "Germany",
  GB: "United Kingdom",
  JP: "Japan",
  RU: "Russia",
  FR: "France",
  NL: "Netherlands",
  KR: "South Korea",
  IN: "India",
  BR: "Brazil",
  CA: "Canada",
  IT: "Italy",
  ES: "Spain",
  AU: "Australia",
  PL: "Poland",
  SE: "Sweden",
  CH: "Switzerland",
  SG: "Singapore",
  HK: "Hong Kong",
};
