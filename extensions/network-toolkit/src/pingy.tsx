import { ActionPanel, Action, Detail, Form, showToast, ToastStyle, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { Netmask } from "netmask";
import fetch from "node-fetch";
import dns from "dns/promises";

export default function Command() {
  const { push } = useNavigation();
  const [input, setInput] = useState<string>("");

  function handleSubmit(values: { input: string }) {
    const trimmedInput = values.input.trim();
    if (isCidr(trimmedInput) || isIp(trimmedInput)) {
      push(<CIDRDetails input={trimmedInput} />);
    } else if (isDomain(trimmedInput)) {
      push(<DNSDetails input={trimmedInput} />);
    } else if (isASN(trimmedInput)) {
      push(<ASDetails input={trimmedInput} />);
    } else {
      showToast(ToastStyle.Failure, "🚫 Invalid Input", "Please enter a valid CIDR, IP, domain, or ASN.");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="🔍 Detect and Lookup" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="📝 Input"
        placeholder="Enter CIDR, IP, domain, or ASN (e.g., 1.1.1.1/32, google.com, AS26058)"
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}

// CIDR and IP Lookup
function CIDRDetails({ input }: { input: string }) {
  const [details, setDetails] = useState<string>("🔄 Loading...");

  useEffect(() => {
    async function fetchDetails() {
      try {
        if (isCidr(input)) {
          const block = new Netmask(input);
          const isPrivate = isRFC1918(block.base);
          const isSingleIP = block.size === 1;
          const broadcast = isSingleIP ? block.base : block.broadcast;
          const startIP = isSingleIP ? block.base : block.first;
          const endIP = isSingleIP ? block.base : block.last;

          const wildcardMask = block.mask
            .split(".")
            .map((octet) => (255 - parseInt(octet)).toString())
            .join(".");
          const prefix = input.split("/")[1] || "";
          const ipClass =
            parseInt(block.base.split(".")[0]) < 128
              ? "Class A"
              : parseInt(block.base.split(".")[0]) < 192
                ? "Class B"
                : "Class C";

          const cidrDetails = `
## 🖧 CIDR Information
- **🔹 IP Address**: ${block.base}
- **🔹 Subnet Mask**: ${block.mask}
- **🔹 Wildcard Mask**: ${wildcardMask}
- **🔹 CIDR Prefix**: /${prefix}
- **🔹 Broadcast Address**: ${broadcast}
- **🔹 Number of Available IPs**: ${block.size - (isSingleIP ? 0 : 2)}
- **🔹 Range**: ${startIP} - ${endIP}
- **🔹 IP Class**: ${ipClass}
          `;

          if (!isPrivate && isSingleIP) {
            const response = await fetch(`https://ipinfo.io/${block.base}/json`);
            const data = await response.json();

            const ipDetails = `
## 🌍 IP Lookup Information
- **🌐 IP**: ${data.ip || "Unknown"}
- **🏙️ City**: ${data.city || "Unknown"}
- **📍 Region**: ${data.region || "Unknown"}
- **🌎 Country**: ${data.country || "Unknown"} ${getFlag(data.country)}
- **📡 Latitude/Longitude**: ${data.loc || "Unknown"}
- **🏢 Organization**: ${data.org || "Unknown"}
- **✉️ Postal Code**: ${data.postal || "Unknown"}

![🗺️ Map Preview](https://maps.googleapis.com/maps/api/staticmap?center=${data.loc}&zoom=4&size=600x300&maptype=roadmap&markers=color:red%7C${data.loc}&key=YOUR_GOOGLE_MAPS_API_KEY)
            `;
            setDetails(`${cidrDetails}\n\n${ipDetails}`);
          } else {
            setDetails(cidrDetails);
          }
        } else if (isIp(input)) {
          const response = await fetch(`https://ipinfo.io/${input}/json`);
          const data = await response.json();

          const ipDetails = `
## 🌍 IP Lookup Information
- **🌐 IP**: ${data.ip || "Unknown"}
- **🏙️ City**: ${data.city || "Unknown"}
- **📍 Region**: ${data.region || "Unknown"}
- **🌎 Country**: ${data.country || "Unknown"} ${getFlag(data.country)}
- **📡 Latitude/Longitude**: ${data.loc || "Unknown"}
- **🏢 Organization**: ${data.org || "Unknown"}
- **✉️ Postal Code**: ${data.postal || "Unknown"}

![🗺️ Map Preview](https://maps.googleapis.com/maps/api/staticmap?center=${data.loc}&zoom=4&size=600x300&maptype=roadmap&markers=color:red%7C${data.loc}&key=YOUR_GOOGLE_MAPS_API_KEY)
          `;
          setDetails(ipDetails);
        }
      } catch (error) {
        setDetails(`
# ❌ Error
An error occurred while fetching details for ${input}: ${error.message}
        `);
      }
    }

    fetchDetails();
  }, [input]);

  return <Detail markdown={details} />;
}

// DNS Lookup
function DNSDetails({ input }: { input: string }) {
  const [details, setDetails] = useState<string>("🔄 Loading...");

  useEffect(() => {
    async function fetchDNSRecords() {
      try {
        const aRecords = await safeResolve(input, "A");
        const aaaaRecords = await safeResolve(input, "AAAA");
        const cnameRecords = await safeResolve(input, "CNAME");
        const mxRecords = await safeResolve(input, "MX");
        const nsRecords = await safeResolve(input, "NS");
        const txtRecords = await safeResolve(input, "TXT");

        setDetails(`
## 🌐 DNS Records for ${input}
- **🔹 A Records**: ${aRecords.length > 0 ? aRecords.join(", ") : "None"}
- **🔹 AAAA Records**: ${aaaaRecords.length > 0 ? aaaaRecords.join(", ") : "None"}
- **🔹 CNAME Records**: ${cnameRecords.length > 0 ? cnameRecords.join(", ") : "None"}
- **🔹 MX Records**: ${
          mxRecords.length > 0 ? mxRecords.map((mx) => `${mx.exchange} (Priority: ${mx.priority})`).join(", ") : "None"
        }
- **🔹 NS Records**: ${nsRecords.length > 0 ? nsRecords.join(", ") : "None"}
- **🔹 TXT Records**: ${txtRecords.length > 0 ? txtRecords.map((txt) => txt.join(" ")).join("\n") : "None"}
        `);
      } catch (error) {
        setDetails(`
# ❌ Error
An error occurred while fetching DNS records for ${input}: ${error.message}
        `);
      }
    }

    fetchDNSRecords();
  }, [input]);

  return <Detail markdown={details} />;
}

// AS Lookup
function ASDetails({ input }: { input: string }) {
  const [details, setDetails] = useState<string>("🔄 Loading...");

  useEffect(() => {
    async function fetchASDetails() {
      try {
        const asn = input.startsWith("AS") ? input.slice(2) : input;
        const response = await fetch(`https://ipinfo.io/${asn}/json`);
        const data = await response.json();

        setDetails(`
## 🖧 AS Details for ${input}
- **🔹 ASN**: ${data.asn || "Unknown"}
- **🔹 Name**: ${data.name || "Unknown"}
- **🔹 Country**: ${data.country || "Unknown"} ${getFlag(data.country)}
- **🔹 Domain**: ${data.domain || "Unknown"}
- **🔹 Route**: ${data.route || "Unknown"}
- **🔹 Type**: ${data.type || "Unknown"}
- **🔹 Organization**: ${data.company?.name || "Unknown"}
        `);
      } catch (error) {
        setDetails(`
# ❌ Error
An error occurred while fetching AS details for ${input}: ${error.message}
        `);
      }
    }

    fetchASDetails();
  }, [input]);

  return <Detail markdown={details} />;
}

// Utility Functions
function isIp(input: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(input);
}

function isCidr(input: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}\/\d+$/.test(input);
}

function isDomain(input: string): boolean {
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
}

function isASN(input: string): boolean {
  return /^AS?\d+$/.test(input);
}

function isRFC1918(ip: string): boolean {
  const privateRanges = [new Netmask("10.0.0.0/8"), new Netmask("172.16.0.0/12"), new Netmask("192.168.0.0/16")];
  return privateRanges.some((range) => range.contains(ip));
}

async function safeResolve(domain: string, recordType: string): Promise<string[] | dns.MxRecord[] | string[][]> {
  try {
    return await dns.resolve(domain, recordType);
  } catch (error) {
    if (error.code === "ENODATA") {
      return [];
    }
    throw error;
  }
}

function getFlag(countryCode: string): string {
  if (!countryCode) {
    return "";
  }
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)));
}
