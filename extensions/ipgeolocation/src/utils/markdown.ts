import { IPData } from "../types";

export function buildMarkdown(data: IPData, isPaid: boolean): string {
  const loc = data.location;
  const sec = data.security;

  let md = `# ${data.ip}\n\n`;

  md += `**${loc.city}, ${loc.state_prov}, ${loc.country_name}** · ${loc.continent_name}\n\n`;

  if (data.hostname) {
    md += `Hostname: \`${data.hostname}\`\n\n`;
  }

  md += `---\n\n`;

  md += `## Location\n`;
  md += `| Field | Value |\n|---|---|\n`;
  md += `| Country Name | ${loc.country_name} |\n`;
  if (loc.country_name_official) {
    md += `| Country Official Name | ${loc.country_name_official} |\n`;
  }
  md += `| Country Code | ${loc.country_code2} (ISO 2-letter) / ${loc.country_code3} (ISO 3-letter) |\n`;
  if (loc.country_capital) {
    md += `| Capital City | ${loc.country_capital} |\n`;
  }
  if (loc.state_prov) {
    md += `| State / Region | ${loc.state_prov}${loc.state_code ? ` (${loc.state_code})` : ""} |\n`;
  }
  if (loc.district) {
    md += `| County / District | ${loc.district} |\n`;
  }
  md += `| City | ${loc.city} |\n`;

  if (loc.zipcode) {
    md += `| ZIP / Postal Code | ${loc.zipcode} |\n`;
  }
  md += `| Coordinates | ${loc.latitude}, ${loc.longitude} |\n`;

  md += `| EU Member | ${loc.is_eu ? "Yes" : "No"} |\n`;

  md += `\n---\n\n`;

  if (isPaid && sec) {
    md += `## Security\n`;
    md += `| Signal | Status |\n|---|---|\n`;
    md += `| Threat Score | ${sec.threat_score}/100 |\n`;
    md += `| VPN Detected | ${sec.is_vpn ? "Yes" : "No"} |\n`;
    if (
      sec.vpn_provider_names &&
      Object.keys(sec.vpn_provider_names).length > 0
    ) {
      md += `| VPN Provider | ${Object.keys(sec.vpn_provider_names).join(", ")} |\n`;
    }
    md += `| Proxy Detected | ${sec.is_proxy ? "Yes" : "No"} |\n`;
    if (
      sec.proxy_provider_names &&
      Object.keys(sec.proxy_provider_names).length > 0
    ) {
      md += `| Proxy Provider | ${Object.keys(sec.proxy_provider_names).join(", ")} |\n`;
    }
    if (typeof sec.is_residential_proxy === "boolean") {
      md += `| Residential Proxy Detected | ${sec.is_residential_proxy ? "Yes" : "No"} |\n`;
    }
    md += `| Tor Detected | ${sec.is_tor ? "Yes" : "No"} |\n`;
    if (typeof sec.is_relay === "boolean") {
      md += `| Relay Detected | ${sec.is_relay ? "Yes" : "No"} |\n`;
    }
    if (sec.relay_provider_name) {
      md += `| Relay Provider | ${sec.relay_provider_name} |\n`;
    }
    md += `| Anonymous IP | ${sec.is_anonymous ? "Yes" : "No"} |\n`;
    md += `| Automated Bot Traffic | ${sec.is_bot ? "Yes" : "No"} |\n`;
    md += `| Is Known Attacker | ${sec.is_known_attacker ? "Yes" : "No"} |\n`;
    md += `| Associated with Spam | ${sec.is_spam ? "Yes" : "No"} |\n`;
    md += `| Hosted on Cloud Infrastructure | ${sec.is_cloud_provider ? `Yes (${sec.cloud_provider_name || "Unknown"})` : "No"} |\n`;

    md += `\n---\n\n`;
  }

  if (data.asn) {
    md += `## ASN\n`;
    md += `| Field | Value |\n|---|---|\n`;
    if (data.asn.as_number) {
      md += `| AS Number | ${data.asn.as_number} |\n`;
    }
    if (data.asn.organization) {
      md += `| AS Organization | ${data.asn.organization} |\n`;
    }
    if (isPaid && data.asn.type) {
      md += `| Type | ${data.asn.type} |\n`;
    }
    if (isPaid && data.asn.domain) {
      md += `| Website | ${data.asn.domain} |\n`;
    }
    if (data.asn.country) {
      md += `| ASN Registered In | ${data.asn.country} |\n`;
    }

    md += `\n---\n\n`;
  }

  if (isPaid && data.company) {
    md += `## Company\n`;
    md += `| Field | Value |\n|---|---|\n`;
    if (data.company.name) {
      md += `| Name | ${data.company.name} |\n`;
    }
    if (data.company.type) {
      md += `| Type | ${data.company.type} |\n`;
    }
    if (data.company.domain) {
      md += `| Website | ${data.company.domain} |\n`;
    }

    md += `\n---\n\n`;
  }

  if (isPaid && data.abuse) {
    md += `## Abuse Contact\n`;
    md += `| Field | Value |\n|---|---|\n`;
    if (data.abuse.country) {
      md += `| Country | ${data.abuse.country} |\n`;
    }
    if (data.abuse.address) {
      md += `| Address | ${data.abuse.address} |\n`;
    }
    const emails = Array.isArray(data.abuse.emails)
      ? data.abuse.emails.join(", ")
      : data.abuse.emails;
    const phones = Array.isArray(data.abuse.phone_numbers)
      ? data.abuse.phone_numbers.join(", ")
      : data.abuse.phone_numbers;
    if (emails) {
      md += `| Emails | ${emails} |\n`;
    }
    if (phones) {
      md += `| Phone Numbers | ${phones} |\n`;
    }

    md += `\n---\n\n`;
  }

  md += `## Timezone\n`;
  md += `| Field | Value |\n|---|---|\n`;
  md += `| Name | ${data.time_zone.name} |\n`;
  md += `| Offset | ${data.time_zone.offset} |\n`;
  md += `| Offset with DST | ${data.time_zone.offset_with_dst} |\n`;
  md += `| Current Time | ${data.time_zone.current_time} |\n`;
  md += `| Timezone Abbreviation | ${data.time_zone.standard_tz_abbreviation} |\n`;
  md += `| Timezone Full Name | ${data.time_zone.standard_tz_full_name} |\n`;
  md += `| Is DST | ${data.time_zone.is_dst ? "Yes" : "No"} |\n`;
  md += `| DST exists | ${data.time_zone.dst_exists ? "Yes" : "No"} |\n`;
  md += `| DST savings | ${data.time_zone.dst_savings} hours |\n`;
  if (data.time_zone.dst_exists) {
    md += `\n### DST Start\n`;
    md += `| Field | Value |\n|---|---|\n`;
    md += `| UTC Time | ${data.time_zone.dst_start?.utc_time} |\n`;
    md += `| Duration | ${data.time_zone.dst_start?.duration} |\n`;
    md += `| Gap | ${data.time_zone.dst_start?.gap ? "Yes" : "No"} |\n`;
    md += `| Overlap | ${data.time_zone.dst_start?.overlap ? "Yes" : "No"} |\n`;
    md += `| Time Before | ${data.time_zone.dst_start?.date_time_before} |\n`;
    md += `| Time After | ${data.time_zone.dst_start?.date_time_after} |\n`;

    md += `\n### DST End\n`;
    md += `| Field | Value |\n|---|---|\n`;
    md += `| UTC Time | ${data.time_zone.dst_end?.utc_time} |\n`;
    md += `| Duration | ${data.time_zone.dst_end?.duration} |\n`;
    md += `| Gap | ${data.time_zone.dst_end?.gap ? "Yes" : "No"} |\n`;
    md += `| Overlap | ${data.time_zone.dst_end?.overlap ? "Yes" : "No"} |\n`;
    md += `| Time Before | ${data.time_zone.dst_end?.date_time_before} |\n`;
    md += `| Time After | ${data.time_zone.dst_end?.date_time_after} |\n`;
  }

  md += `\n---\n\n`;

  if (isPaid && data.network) {
    md += `## Network\n`;
    md += `| Field | Value |\n|---|---|\n`;
    if (data.network.connection_type) {
      md += `| Connection Type | ${data.network.connection_type} |\n`;
    }
    if (data.network.route) {
      md += `| BGP Route | ${data.network.route} |\n`;
    }
    if (typeof data.network.is_anycast === "boolean") {
      md += `| Is this IP Anycast? | ${data.network.is_anycast ? "Yes" : "No"} |\n`;
    }

    md += `\n---\n\n`;
  }

  md += `## Currency\n`;
  md += `| Field | Value |\n|---|---|\n`;
  if (data.currency.name) {
    md += `| Name | ${data.currency.name} |\n`;
  }
  if (data.currency.code) {
    md += `| Code | ${data.currency.code} |\n`;
  }
  if (data.currency.symbol) {
    md += `| Symbol | ${data.currency.symbol} |\n`;
  }

  md += `\n---\n\n`;

  if (data.country_metadata) {
    md += `## Country Info\n`;
    md += `| Field | Value |\n|---|---|\n`;
    if (data.country_metadata.calling_code) {
      md += `| Calling Code | ${data.country_metadata.calling_code} |\n`;
    }
    if (data.country_metadata.tld) {
      md += `| TLD | ${data.country_metadata.tld} |\n`;
    }
    if (data.country_metadata.languages) {
      const languages = Array.isArray(data.country_metadata.languages)
        ? data.country_metadata.languages.join(", ")
        : data.country_metadata.languages;
      if (languages) {
        md += `| Languages | ${languages} |\n`;
      }
    }
    md += `\n---\n\n`;
  }

  md += `*Powered by [ipgeolocation.io](https://ipgeolocation.io)*`;

  return md;
}
