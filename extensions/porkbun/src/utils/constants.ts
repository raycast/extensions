export const DNS_RECORD_TYPES = [
  { type: "A", description: "Address record", hasPriority: false },
  { type: "MX", description: "Mail exchange record", hasPriority: true },
  { type: "CNAME", description: "Canonical name record", hasPriority: false },
  { type: "ALIAS", description: "CNAME flattening record", hasPriority: false },
  { type: "TXT", description: "Text record", hasPriority: false },
  { type: "NS", description: "Name server record", hasPriority: false },
  { type: "AAAA", description: "IPv6 address record", hasPriority: false },
  { type: "SRV", description: "Service record", hasPriority: true },
  { type: "TLSA", description: "TLS Authentication Record", hasPriority: false },
  { type: "CAA", description: "Certification Authority Authorization", hasPriority: false },
];
