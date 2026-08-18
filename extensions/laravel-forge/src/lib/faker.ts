import { faker } from "@faker-js/faker";
import { IServer, ISite } from "../types";

export const createFakeServer = (count = 1): IServer[] => {
  const fakeServer = (): IServer => ({
    id: faker.number.int(),
    api_token_key: faker.string.sample(),
    ssh_user: faker.internet.username(),
    org_slug: faker.internet.domainWord(),
    credential_id: faker.number.int(),
    name: faker.company.name(),
    slug: faker.internet.domainWord(),
    type: faker.string.sample(),
    provider: faker.helpers.arrayElement(["ocean2", "linode", "vultr", "aws", "hetzner", "custom"]),
    identifier: faker.string.sample(),
    size: faker.string.sample(),
    region: faker.string.sample(),
    ubuntu_version: faker.string.sample(),
    db_status: faker.string.sample(),
    redis_status: faker.string.sample(),
    php_version: faker.string.sample(),
    php_cli_version: faker.string.sample(),
    opcache_status: faker.string.sample(),
    database_type: faker.string.sample(),
    ip_address: faker.internet.ipv4(),
    ssh_port: faker.number.int(),
    private_ip_address: faker.internet.ipv4(),
    local_public_key: faker.string.sample(),
    connection_status: faker.helpers.arrayElement(["connected", "failed"]),
    timezone: "UTC",
    revoked: faker.datatype.boolean(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.past().toISOString(),
    is_ready: faker.datatype.boolean(),
    keywords: faker.helpers.arrayElements([faker.internet.domainName(), faker.internet.domainName()]),
  });
  return Array.from({ length: count }, fakeServer);
};

export const createFakeSite = (serverId: IServer["id"], count = 1): ISite[] => {
  const fakeSite = (): ISite => ({
    id: faker.number.int(),
    server_id: serverId,
    name: faker.internet.domainName(),
    status: "installed",
    url: faker.internet.url(),
    user: faker.internet.username(),
    https: faker.datatype.boolean(),
    web_directory: faker.string.sample(),
    root_directory: faker.string.sample(),
    aliases: [],
    php_version: faker.helpers.arrayElement(["PHP 8.2", "PHP 8.3", "PHP 8.4"]),
    deployment_status: faker.helpers.arrayElement(["deploying", "deployed", "failed", null]),
    quick_deploy: faker.datatype.boolean(),
    isolated: faker.datatype.boolean(),
    shared_paths: [],
    repository: {
      provider: "GitHub",
      url: faker.internet.url(),
      branch: "main",
      status: "installed",
    },
    database: faker.string.sample(),
    maintenance_mode: { enabled: false, status: null },
    zero_downtime_deployments: faker.datatype.boolean(),
    wildcards: faker.datatype.boolean(),
    app_type: faker.string.sample(),
    uses_envoyer: false,
    deployment_url: faker.internet.url(),
    healthcheck_url: null,
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.past().toISOString(),
  });
  return Array.from({ length: count }, fakeSite);
};
