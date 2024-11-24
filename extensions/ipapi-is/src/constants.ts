export const typesAndTitles = {
  // ASN
  country_code: { type: "string", title: "Country Code" },
  domain: { type: "link", title: "Domain" },
  whois: { type: "link", title: "WHOIS" },
  // Abuse
  email: { type: "email", title: "Email" },
  phone: { type: "phone", title: "Phone" },
  // Location
  latitude: { type: "number", title: "Latitude" },
  longitude: { type: "number", title: "Longitude" },
  local_time: { type: "number", title: "Local Time" },
  local_time_unix: { type: "number", title: "Local Time (UNIX)" },
  is_dst: { type: "boolean", title: "Daylight Saving Time" },
};
