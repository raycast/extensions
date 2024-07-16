// src/components/HostInformationView.tsx
import { Detail } from "@raycast/api";

interface HostInformation {
    ip_str: string;
    hostnames: string[];
    domains: string[];
    country_name: string;
    org: string;
    os: string;
    ports: number[];
    // Add more properties as needed
}

export function HostInformationView({ data }: { data: HostInformation }) {
    const markdown = `
# Host Information: ${data.ip_str}

## General Information
- **Hostnames:** ${data.hostnames.join(", ") || "N/A"}
- **Domains:** ${data.domains.join(", ") || "N/A"}
- **Country:** ${data.country_name || "N/A"}
- **Organization:** ${data.org || "N/A"}
- **Operating System:** ${data.os || "N/A"}

## Open Ports
${data.ports.map((port) => `- ${port}`).join("\n")}

## Raw Data
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`;

    return <Detail markdown={markdown} />;
}
