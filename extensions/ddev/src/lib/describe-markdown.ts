import type { DdevDescribeRaw } from "./types";

function row(label: string, value: string | undefined | null): string {
  return value ? `| ${label} | ${value} |` : "";
}

export function buildDescribeMarkdown(d: DdevDescribeRaw): string {
  const sections: string[] = [];

  sections.push(`# ${d.name}`);

  const project = [
    "## Project",
    "",
    "| Field | Value |",
    "| --- | --- |",
    row("Type", `\`${d.type}\``),
    row("Status", d.status_desc ?? d.status),
    row("Location", d.shortroot ? `\`${d.shortroot}\`` : `\`${d.approot}\``),
    row("Docroot", d.docroot ? `\`${d.docroot}\`` : null),
    row("Primary URL", d.primary_url),
    row("Router", d.router_status ? `${d.router} (${d.router_status})` : d.router),
    row("PHP", d.php_version),
    row("Node.js", d.nodejs_version),
    row("Webserver", d.webserver_type),
    row("Performance Mode", d.performance_mode),
    row("Xdebug", d.xdebug_enabled === undefined ? null : d.xdebug_enabled ? "enabled" : "disabled"),
  ]
    .filter(Boolean)
    .join("\n");
  sections.push(project);

  if (d.dbinfo) {
    const db = [
      "## Database",
      "",
      "| Field | Value |",
      "| --- | --- |",
      row("Type", `${d.dbinfo.database_type} ${d.dbinfo.database_version}`),
      row("Host", `\`${d.dbinfo.host}\``),
      row("Port", `${d.dbinfo.dbPort} (host: ${d.dbinfo.published_port})`),
      row("Database", `\`${d.dbinfo.dbname}\``),
      row("User", `\`${d.dbinfo.username}\``),
      row("Password", `\`${d.dbinfo.password}\``),
    ].join("\n");
    sections.push(db);
  }

  if (d.urls?.length) {
    sections.push(["## URLs", "", ...d.urls.map((u) => `- ${u}`)].join("\n"));
  }

  if (d.services && Object.keys(d.services).length) {
    const services = [
      "## Services",
      "",
      "| Service | Status | Image | URL |",
      "| --- | --- | --- | --- |",
      ...Object.values(d.services).map((s) => {
        const url = s.https_url ?? s.http_url ?? "—";
        return `| ${s.short_name} | ${s.status} | \`${s.image}\` | ${url} |`;
      }),
    ].join("\n");
    sections.push(services);
  }

  if (d.mailpit_url || d.mailpit_https_url) {
    const mail = [
      "## Mailpit",
      "",
      "| Field | Value |",
      "| --- | --- |",
      row("HTTPS", d.mailpit_https_url),
      row("HTTP", d.mailpit_url),
    ]
      .filter(Boolean)
      .join("\n");
    sections.push(mail);
  }

  return sections.join("\n\n");
}
