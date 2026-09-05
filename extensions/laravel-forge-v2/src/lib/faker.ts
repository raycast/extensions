import { faker } from "@faker-js/faker";
import { IServer, ISite } from "../types";

export const createFakeServer = (count = 1): IServer[] => {
  const fakeServer = (): IServer => ({
    id: String(faker.datatype.number()),
    api_token_key: "laravel_forge_api_key",
    ssh_user: faker.internet.userName(),
    org_slug: faker.helpers.arrayElement(["acme", "personal", "clients"]),
    credential_id: faker.datatype.string(),
    name: faker.company.name(),
    type: faker.datatype.string(),
    provider: faker.helpers.arrayElement(["ocean2", "linode", "vultr", "aws", "hetzner", "custom"]),
    provider_id: faker.datatype.string(),
    size: faker.datatype.string(),
    region: faker.datatype.string(),
    ubuntu_version: faker.datatype.string(),
    db_status: faker.datatype.string(),
    redis_status: faker.datatype.string(),
    php_version: faker.datatype.string(),
    php_cli_version: faker.datatype.string(),
    opcache_status: faker.datatype.string(),
    database_type: faker.datatype.string(),
    ip_address: faker.internet.ip(),
    ssh_port: faker.datatype.number(),
    private_ip_address: faker.internet.ip(),
    local_public_key: faker.datatype.string(),
    connection_status: null,
    timezone: "UTC",
    revoked: false,
    created_at: faker.date.past().toISOString(),
    is_ready: true,
    tags: [],
    keywords: faker.helpers.arrayElements([faker.internet.domainName(), faker.internet.domainName()]),
  });
  return Array.from({ length: count }, fakeServer);
};

export const createFakeSite = (serverId: IServer["id"], count = 1): ISite[] => {
  const fakeSite = (): ISite => ({
    id: String(faker.datatype.number()),
    server_id: serverId,
    org_slug: faker.helpers.arrayElement(["acme", "personal", "clients"]),
    name: faker.internet.domainName(),
    aliases: [],
    directory: faker.datatype.string(),
    wildcards: faker.datatype.boolean(),
    status: faker.datatype.string(),
    repository: faker.internet.url(),
    repository_provider: faker.datatype.string(),
    repository_branch: faker.datatype.string(),
    repository_status: faker.datatype.string(),
    quick_deploy: faker.datatype.boolean(),
    deployment_status: faker.helpers.arrayElement(["deploying", "deployed", "failed", null]),
    is_online: faker.datatype.boolean(),
    project_type: faker.datatype.string(),
    php_version: faker.datatype.string(),
    app: null,
    created_at: faker.date.past().toISOString(),
    username: faker.internet.userName(),
    deployment_url: faker.internet.url(),
    is_secured: faker.datatype.boolean(),
    tags: [],
  });
  return Array.from({ length: count }, fakeSite);
};
