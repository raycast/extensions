import { ServerConfig, ServerStatus, PM2Process } from "../types";
import { formatUptime } from "../utils";

interface ServerDetailMarkdownProps {
  server: ServerConfig;
  status: ServerStatus;
}

export function generateServerDetailMarkdown({ server, status }: ServerDetailMarkdownProps): string {
  let markdown = `# ${server.name}\n\n`;

  if (status.error && !status.healthCheck) {
    markdown += `## Error\n\n\`\`\`\n${status.error}\n\`\`\`\n\n`;
  }

  if (status.healthCheck) {
    markdown += `## HTTP Health Check\n\n`;
    if (status.healthCheck.httpCode) {
      markdown += `**Status Code:** \`${status.healthCheck.httpCode}\`  \n**URL:** ${server.healthCheckUrl}\n\n`;
    } else {
      markdown += `**Error:** ${status.healthCheck.error || "Unknown"}\n\n`;
    }
  }

  if (status.processes.length > 0) {
    markdown += `## PM2 Services\n\n`;
    markdown += `| Service | Status | Uptime |\n`;
    markdown += `|---------|--------|--------|\n`;

    markdown += status.processes
      .map((proc: PM2Process) => {
        const pm2Status = proc.pm2_env.status;
        const statusText =
          pm2Status === "online" ? "✅ Online" : pm2Status === "stopped" ? "❌ Stopped" : `⚠️ ${pm2Status}`;

        // Calculate uptime from created_at timestamp
        const created_at = proc.pm2_env.created_at || 0;
        const currentTime = Date.now();
        const uptimeMs = created_at > 0 ? currentTime - created_at : 0;
        const uptime = formatUptime(uptimeMs);

        return `| **${proc.name}** | ${statusText} | ${uptime} |`;
      })
      .join("\n");

    markdown += `\n\n`;
  }

  return markdown;
}
