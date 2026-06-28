import { ResourceListItem } from "../types";

/**
 * Mock resources used only in development to generate screenshots.
 */
export const MOCK_RESOURCES: ResourceListItem[] = [
  {
    id: "res-01",
    name: "dev-payments-api",
    address: "payments.api.dev.example.com",
    alias: "dev-payments",
    networkName: "development-us-west-2-platform",
    url: "http://dev-payments-api",
  },
  {
    id: "res-02",
    name: "staging-checkout-frontend",
    address: "checkout.staging.web.example.com",
    alias: "stg-checkout",
    networkName: "staging-eu-west-1-web",
    url: "http://staging-checkout-frontend",
  },
  {
    id: "res-03",
    name: "prod-customer-portal",
    address: "portal.prod.web.example.com",
    alias: "customer-portal",
    networkName: "production-us-east-1-web",
    url: "http://prod-customer-portal",
  },
  {
    id: "res-04",
    name: "analytics-redash",
    address: "redash.analytics.example.com",
    alias: "analytics",
    networkName: "corp-network",
    url: "http://analytics-redash",
  },
  {
    id: "res-05",
    name: "internal-vpn-gateway",
    address: "vpn.corp.example.com",
    networkName: "corp-network",
    url: "http://vpn.corp.example.com",
  },
  {
    id: "res-06",
    name: "prod-postgres-primary",
    address: "pg-primary.prod.db.example.com",
    alias: "pg-prod-1",
    networkName: "production-us-east-1-databases",
    url: "http://pg-primary.prod.db.example.com",
  },
  {
    id: "res-07",
    name: "dev-postgres-replica",
    address: "pg-replica.dev.db.example.com",
    alias: "pg-dev-replica",
    networkName: "development-us-west-2-databases",
    url: "http://pg-replica.dev.db.example.com",
  },
  {
    id: "res-08",
    name: "message-queue-rabbitmq",
    address: "rabbitmq.messaging.example.com",
    alias: "mq",
    networkName: "shared-infra",
    url: "http://rabbitmq.messaging.example.com",
  },
  {
    id: "res-09",
    name: "dev-feature-flags",
    address: "flags.dev.platform.example.com",
    alias: "ff-dev",
    networkName: "development-us-east-1-platform",
    url: "http://flags.dev.platform.example.com",
  },
  {
    id: "res-10",
    name: "prod-feature-flags",
    address: "flags.prod.platform.example.com",
    alias: "ff-prod",
    networkName: "production-us-east-1-platform",
    url: "http://flags.prod.platform.example.com",
  },
];
