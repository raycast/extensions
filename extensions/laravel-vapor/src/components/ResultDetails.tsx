import { List } from "@raycast/api";
import { useMemo } from "react";
import { Cache } from "../api/caches";
import { Database } from "../api/databases";
import { Domain } from "../api/domains";
import { Network } from "../api/networks";
import { Project } from "../api/projects";

export interface Props {
  type: "cache" | "database" | "domain" | "network" | "project";
  result: Cache | Database | Domain | Network | Project;
}

function cacheDetails(cache: Cache) {
  let markdown = `# ${cache.name}`;

  const table = [
    { name: "ID", value: cache.id },
    { name: "Region", value: cache.region },
    { name: "Status", value: cache.status },
    { name: "Type", value: cache.type },
    { name: "Size", value: cache.instance_class },
    { name: "Scale", value: cache.scale },
    { name: "Created At", value: new Date(cache.created_at).toLocaleString() },
    { name: "Updated At", value: new Date(cache.updated_at).toLocaleString() },
  ];

  markdown += "\n\n\n";
  markdown += "| Name | Value |";
  markdown += "\n";
  markdown += "| --- | --- |";
  markdown += "\n";

  table.forEach((row) => {
    markdown += `| ${row.name} | ${row.value} |`;
    markdown += "\n";
  });

  return markdown;
}

function databaseDetails(database: Database) {
  let markdown = `# ${database.name}`;

  const table = [
    { name: "ID", value: database.id },
    { name: "Region", value: database.region },
    { name: "Status", value: database.status },
    { name: "Type", value: database.type },
    { name: "Size", value: database.instance_class },
    { name: "Storage", value: database.storage },
    { name: "Backup Retention Period", value: database.backup_retention_period },
    { name: "Is Public", value: database.is_public ? "Yes" : "No" },
    { name: "Endpoint", value: database.endpoint },
    { name: "Created At", value: new Date(database.created_at).toLocaleString() },
    { name: "Updated At", value: new Date(database.updated_at).toLocaleString() },
  ];

  markdown += "\n\n\n";
  markdown += "| Name | Value |";
  markdown += "\n";
  markdown += "| --- | --- |";
  markdown += "\n";

  table.forEach((row) => {
    markdown += `| ${row.name} | ${row.value} |`;
    markdown += "\n";
  });

  return markdown;
}

function domainDetails(domain: Domain) {
  let markdown = `# ${domain.zone}`;

  const table = [
    { name: "ID", value: domain.id },
    { name: "No. Records", value: domain.records_count },
    { name: "SES Verified", value: domain.ses_verified ? "Yes" : "No" },
    { name: "Nameservers", value: domain.nameservers.join(", ") },
    { name: "Importing", value: domain.importing ? "Yes" : "No" },
    { name: "Queued for Deletion", value: domain.queued_for_deletion ? "Yes" : "No" },
    { name: "Created At", value: new Date(domain.created_at).toLocaleString() },
    { name: "Updated At", value: new Date(domain.updated_at).toLocaleString() },
  ];

  markdown += "\n\n\n";
  markdown += "| Name | Value |";
  markdown += "\n";
  markdown += "| --- | --- |";
  markdown += "\n";

  table.forEach((row) => {
    markdown += `| ${row.name} | ${row.value} |`;
    markdown += "\n";
  });

  return markdown;
}

function networkDetails(network: Network) {
  let markdown = `# ${network.name}`;

  const table = [
    { name: "ID", value: network.id },
    { name: "Region", value: network.region },
    { name: "Status", value: network.status },
    { name: "Public Subnets", value: network.public_subnets.join(", ") },
    { name: "Private Subnets", value: network.private_subnets.join(", ") },
    { name: "Has Internet Access", value: network.has_internet_access ? "Yes" : "No" },
    { name: "Created At", value: new Date(network.created_at).toLocaleString() },
    { name: "Updated At", value: new Date(network.updated_at).toLocaleString() },
  ];

  markdown += "\n\n\n";
  markdown += "| Name | Value |";
  markdown += "\n";
  markdown += "| --- | --- |";
  markdown += "\n";

  table.forEach((row) => {
    markdown += `| ${row.name} | ${row.value} |`;
    markdown += "\n";
  });

  return markdown;
}

function projectDetails(project: Project) {
  let markdown = `# ${project.name}`;

  const table = [
    { name: "ID", value: project.id },
    {
      name: "Last Deployed At",
      value: project.last_deployed_at ? new Date(project.last_deployed_at).toLocaleString() : "N/A",
    },
    { name: "Region", value: project.region },
    { name: "Bucket", value: project.bucket },
    { name: "Assets Bucket", value: project.asset_bucket || "N/A" },
    { name: "Cloudfront Status", value: project.cloudfront_status || "N/A" },
    { name: "Cloudfront ID", value: project.cloudfront_id || "N/A" },
    { name: "Cloudfront Domain", value: project.cloudfront_domain || "N/A" },
    { name: "Container Repository", value: project.container_repository || "N/A" },
    { name: "Github Repo", value: project.github_repository || "N/A" },
    { name: "Created At", value: new Date(project.created_at).toLocaleString() },
    { name: "Updated At", value: new Date(project.updated_at).toLocaleString() },
  ];

  markdown += "\n\n\n";
  markdown += "| Name | Value |";
  markdown += "\n";
  markdown += "| --- | --- |";
  markdown += "\n";

  table.forEach((row) => {
    markdown += `| ${row.name} | ${row.value} |`;
    markdown += "\n";
  });

  return markdown;
}

export default function ResultDetails(props: Props) {
  const { type, result } = props;

  const markdown = useMemo(() => {
    switch (type) {
      case "cache":
        return cacheDetails(result as Cache);
      case "database":
        return databaseDetails(result as Database);
      case "domain":
        return domainDetails(result as Domain);
      case "network":
        return networkDetails(result as Network);
      case "project":
        return projectDetails(result as Project);
    }
  }, [type, result]);

  return <List.Item.Detail markdown={markdown} />;
}
