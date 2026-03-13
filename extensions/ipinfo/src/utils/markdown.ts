import { IPinfo, IPinfoLite } from "node-ipinfo/dist/src/common";
import { getFlagEmoji } from "./country-emoji";

export const constructMarkdown = (ipInfo: IPinfoLite | IPinfo) => `
# **${ipInfo.ip}**
---
## ${ipInfo.country} ${getFlagEmoji(ipInfo.countryCode)}
\`\`\`json
${JSON.stringify(ipInfo, null, 2)}
\`\`\`
`;
