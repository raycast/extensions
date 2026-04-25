// src/lib/api/mock.ts
// Mock data for development and testing without OAuth setup.
// When useMockData preference is enabled, all API calls return these datasets.
// Each mock dataset is realistic and covers various edge cases and severity levels.

import { LogRecord } from "../types/log";
import { Problem } from "../types/problem";
import { Deployment } from "../types/deployment";
import { Span } from "../types/span";
import type { Entity } from "../types/entity";
import type { SavedQuery } from "../types/savedQuery";

export function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

const m = 60_000;
const h = 3_600_000;
const d = 24 * h;

export const MOCK_LOGS: LogRecord[] = [
  {
    timestamp: ago(2 * m),
    loglevel: "ERROR",
    content: "NullPointerException in PaymentService.processTransaction() at line 142",
    "log.source": "/var/log/payment-service/app.log",
    "service.name": "payment-service",
    "dt.entity.host": "HOST-abc123",
    status: "ERROR",
  },
  {
    timestamp: ago(5 * m),
    loglevel: "ERROR",
    content: "Failed to connect to database: Connection refused (host=db-primary:5432, retries=3)",
    "log.source": "/var/log/order-service/app.log",
    "service.name": "order-service",
    "dt.entity.host": "HOST-def456",
    status: "ERROR",
  },
  {
    timestamp: ago(12 * m),
    loglevel: "WARN",
    content: "Response time exceeded threshold: 3200ms (threshold=2000ms) for GET /api/v2/products",
    "log.source": "/var/log/api-gateway/access.log",
    "service.name": "api-gateway",
    "dt.entity.host": "HOST-ghi789",
    status: "SLOW",
  },
  {
    timestamp: ago(15 * m),
    loglevel: "ERROR",
    content:
      "Unhandled promise rejection in Lambda function processOrders: TypeError: Cannot read properties of undefined",
    "log.source": "aws-lambda://process-orders",
    "service.name": "order-processor-lambda",
    "dt.entity.host": "HOST-lambda001",
    status: "ERROR",
  },
  {
    timestamp: ago(20 * m),
    loglevel: "INFO",
    content: "Deployment completed successfully: order-service v2.4.1 → v2.4.2 (canary: 10%)",
    "log.source": "/var/log/deploy-agent/events.log",
    "service.name": "deploy-agent",
    "dt.entity.host": "HOST-ci001",
    status: "OK",
  },
  {
    timestamp: ago(28 * m),
    loglevel: "WARN",
    content: "Memory usage at 87% on pod user-service-7d4b9c-xkv2p (limit: 512Mi, used: 445Mi)",
    "log.source": "k8s://namespace/production/user-service",
    "service.name": "user-service",
    "dt.entity.host": "HOST-k8s-node-03",
    status: "WARNING",
  },
  {
    timestamp: ago(35 * m),
    loglevel: "ERROR",
    content: "Authentication token expired. User session invalidated. userId=usr_882kd, tokenAge=3601s",
    "log.source": "/var/log/auth-service/app.log",
    "service.name": "auth-service",
    "dt.entity.host": "HOST-auth01",
    status: "AUTH_ERROR",
  },
  {
    timestamp: ago(42 * m),
    loglevel: "DEBUG",
    content: "Cache miss for key: product_catalog_page_3 — fetching from origin",
    "log.source": "/var/log/cache-service/debug.log",
    "service.name": "cache-service",
    "dt.entity.host": "HOST-cache01",
    status: "OK",
  },
  {
    timestamp: ago(1 * h),
    loglevel: "ERROR",
    content: "Kafka consumer lag exceeded limit: topic=order-events, partition=2, lag=15820 messages",
    "log.source": "/var/log/kafka-consumer/app.log",
    "service.name": "order-consumer",
    "dt.entity.host": "HOST-kafka01",
    status: "LAG",
  },
  {
    timestamp: ago(1 * h + 10 * m),
    loglevel: "INFO",
    content: "Scheduled job completed: cleanup-expired-sessions removed 2340 records in 1.2s",
    "log.source": "/var/log/scheduler/jobs.log",
    "service.name": "job-scheduler",
    "dt.entity.host": "HOST-worker01",
    status: "OK",
  },
  {
    timestamp: ago(1 * h + 25 * m),
    loglevel: "WARN",
    content: "Rate limit approaching for external API: stripe.com — 85/100 requests used (window=60s)",
    "log.source": "/var/log/billing-service/app.log",
    "service.name": "billing-service",
    "dt.entity.host": "HOST-billing01",
    status: "RATE_LIMIT",
  },
  {
    timestamp: ago(1 * h + 45 * m),
    loglevel: "FATAL",
    content: "Out of memory: JVM heap space exhausted. Initiating emergency restart. Service: inventory-service",
    "log.source": "/var/log/inventory-service/app.log",
    "service.name": "inventory-service",
    "dt.entity.host": "HOST-inv02",
    status: "FATAL",
  },
  {
    timestamp: ago(2 * h),
    loglevel: "ERROR",
    content: "SSL certificate will expire in 7 days: *.internal.company.com (expires 2026-04-19)",
    "log.source": "/var/log/cert-monitor/alerts.log",
    "service.name": "cert-monitor",
    "dt.entity.host": "HOST-infra01",
    status: "CERT_EXPIRY",
  },
  {
    timestamp: ago(2 * h + 30 * m),
    loglevel: "INFO",
    content: "Feature flag 'new_checkout_flow' enabled for 25% of users (experiment: checkout-v2)",
    "log.source": "/var/log/feature-flags/events.log",
    "service.name": "feature-flag-service",
    "dt.entity.host": "HOST-ff01",
    status: "OK",
  },
  {
    timestamp: ago(3 * h),
    loglevel: "WARN",
    content: "Disk space on HOST-db-primary at 79% (used: 395GB / 500GB). Consider cleanup.",
    "log.source": "/var/log/system/diskmonitor.log",
    "service.name": "system-monitor",
    "dt.entity.host": "HOST-db-primary",
    status: "WARNING",
  },
  {
    timestamp: ago(3 * h + 15 * m),
    loglevel: "ERROR",
    content: "GraphQL resolver error: Cannot query field 'discountCode' on type 'CartItem'. Schema mismatch.",
    "log.source": "/var/log/graphql-api/errors.log",
    "service.name": "graphql-api",
    "dt.entity.host": "HOST-api02",
    status: "SCHEMA_ERROR",
  },
  {
    timestamp: ago(4 * h),
    loglevel: "DEBUG",
    content: "Incoming request: POST /api/v1/checkout — userId=usr_991kx, cartId=cart_77abc, items=4",
    "log.source": "/var/log/checkout-service/debug.log",
    "service.name": "checkout-service",
    "dt.entity.host": "HOST-checkout01",
    status: "OK",
  },
  {
    timestamp: ago(4 * h + 30 * m),
    loglevel: "INFO",
    content: "Autoscaling triggered: order-service scaled from 3 → 6 replicas (CPU: 78%)",
    "log.source": "k8s://namespace/production/hpa-events",
    "service.name": "order-service",
    "dt.entity.host": "HOST-k8s-node-01",
    status: "SCALING",
  },
  {
    timestamp: ago(5 * h),
    loglevel: "ERROR",
    content: "S3 upload failed: AccessDenied — bucket=user-avatars-prod, key=uploads/usr_44xyz/avatar.jpg",
    "log.source": "/var/log/media-service/app.log",
    "service.name": "media-service",
    "dt.entity.host": "HOST-media01",
    status: "ACCESS_DENIED",
  },
  {
    timestamp: ago(6 * h),
    loglevel: "INFO",
    content: "Daily metrics report generated: 42,810 orders processed, avg latency 210ms, error rate 0.3%",
    "log.source": "/var/log/analytics/daily-report.log",
    "service.name": "analytics-service",
    "dt.entity.host": "HOST-analytics01",
    status: "OK",
  },
];

export const MOCK_PROBLEMS: Problem[] = [
  {
    "event.id": "PROB-001",
    "event.name": "Payment service response time degradation",
    "event.status": "OPEN",
    "event.severity": "PERFORMANCE",
    "event.start": ago(45 * m),
    "event.end": null,
    affected_entity_ids: ["SERVICE-payment-service", "HOST-abc123"],
    maintenance_window: false,
    root_cause_entity_id: "SERVICE-payment-service",
  },
  {
    "event.id": "PROB-002",
    "event.name": "Database connection pool exhaustion on db-primary",
    "event.status": "OPEN",
    "event.severity": "AVAILABILITY",
    "event.start": ago(20 * m),
    "event.end": null,
    affected_entity_ids: ["HOST-db-primary", "SERVICE-order-service", "SERVICE-user-service"],
    maintenance_window: false,
    root_cause_entity_id: "HOST-db-primary",
  },
  {
    "event.id": "PROB-003",
    "event.name": "Order processor Lambda high error rate",
    "event.status": "OPEN",
    "event.severity": "ERROR",
    "event.start": ago(30 * m),
    "event.end": null,
    affected_entity_ids: ["SERVICE-order-processor-lambda"],
    maintenance_window: false,
    root_cause_entity_id: "SERVICE-order-processor-lambda",
  },
  {
    "event.id": "PROB-004",
    "event.name": "Inventory service JVM memory pressure",
    "event.status": "OPEN",
    "event.severity": "RESOURCE_CONTENTION",
    "event.start": ago(1 * h + 15 * m),
    "event.end": null,
    affected_entity_ids: ["SERVICE-inventory-service", "HOST-inv02"],
    maintenance_window: false,
    root_cause_entity_id: "HOST-inv02",
  },
  {
    "event.id": "PROB-005",
    "event.name": "Custom alert: API error rate threshold exceeded",
    "event.status": "OPEN",
    "event.severity": "CUSTOM_ALERT",
    "event.start": ago(10 * m),
    "event.end": null,
    affected_entity_ids: ["SERVICE-graphql-api"],
    maintenance_window: false,
    root_cause_entity_id: null,
  },
];

export const MOCK_DEPLOYMENTS: Deployment[] = [
  {
    "event.id": "DEP-001",
    "event.name": "payment-service v2.4.3 release",
    "event.type": "CUSTOM_DEPLOYMENT",
    "event.start": ago(15 * m),
    "event.provider": "kubernetes",
    affected_entity_name: "payment-service",
    "deployment.version": "2.4.3",
    "deployment.release_stage": "production",
  },
  {
    "event.id": "DEP-002",
    "event.name": "order-service canary rollout (10%)",
    "event.type": "DAVIS_DEPLOYMENT",
    "event.start": ago(45 * m),
    "event.provider": "kubernetes",
    affected_entity_name: "order-service",
    "deployment.version": "3.1.0",
    "deployment.release_stage": "canary",
  },
  {
    "event.id": "DEP-003",
    "event.name": "api-gateway hotfix deployment",
    "event.type": "CUSTOM_DEPLOYMENT",
    "event.start": ago(2 * h),
    "event.provider": "docker",
    affected_entity_name: "api-gateway",
    "deployment.version": "2.8.1",
    "deployment.release_stage": "production",
  },
  {
    "event.id": "DEP-004",
    "event.name": "user-service blue/green swap",
    "event.type": "CUSTOM_DEPLOYMENT",
    "event.start": ago(4 * h),
    "event.provider": "kubernetes",
    affected_entity_name: "user-service",
    "deployment.version": "1.9.5",
    "deployment.release_stage": "production",
  },
  {
    "event.id": "DEP-005",
    "event.name": "analytics-pipeline rebuild",
    "event.type": "DAVIS_DEPLOYMENT",
    "event.start": ago(6 * h),
    "event.provider": "batch-job",
    affected_entity_name: "analytics-service",
    "deployment.version": "0.5.2",
    "deployment.release_stage": "production",
  },
];

export const MOCK_SPANS: Span[] = [
  {
    trace_id: "trace-001-abc123def456",
    span_id: "span-payment-process",
    "span.name": "POST /api/payment/process",
    "service.name": "payment-service",
    "span.duration.us": 245000, // 245ms
    status_code: "ERROR",
    timestamp: ago(2 * m),
  },
  {
    trace_id: "trace-002-xyz789uvw012",
    span_id: "span-db-query",
    "span.name": "SELECT * FROM orders",
    "service.name": "order-service",
    "span.duration.us": 87000, // 87ms
    status_code: "OK",
    timestamp: ago(5 * m),
  },
  {
    trace_id: "trace-001-abc123def456",
    span_id: "span-db-checkout",
    "span.name": "db.execute{checkout_transaction}",
    "service.name": "checkout-service",
    "span.duration.us": 1250000, // 1.25s
    status_code: "ERROR",
    timestamp: ago(3 * m),
  },
  {
    trace_id: "trace-003-qwe456rty789",
    span_id: "span-api-call",
    "span.name": "GET /api/v2/products",
    "service.name": "api-gateway",
    "span.duration.us": 120000, // 120ms
    status_code: "OK",
    timestamp: ago(8 * m),
  },
  {
    trace_id: "trace-004-asd789fgh012",
    span_id: "span-cache-lookup",
    "span.name": "redis.get{user_profile}",
    "service.name": "cache-service",
    "span.duration.us": 5200, // 5.2ms
    status_code: "OK",
    timestamp: ago(12 * m),
  },
  {
    trace_id: "trace-005-jkl012mno345",
    span_id: "span-auth-verify",
    "span.name": "token.verify{jwt}",
    "service.name": "auth-service",
    "span.duration.us": 32000, // 32ms
    status_code: "OK",
    timestamp: ago(1 * m),
  },
  {
    trace_id: "trace-006-pqr345stu678",
    span_id: "span-kafka-publish",
    "span.name": "kafka.publish{order-events}",
    "service.name": "order-processor",
    "span.duration.us": 650000, // 650ms
    status_code: "ERROR",
    timestamp: ago(25 * m),
  },
  {
    trace_id: "trace-007-vwx678yza901",
    span_id: "span-graphql-resolve",
    "span.name": "GraphQL.resolveField{user}",
    "service.name": "graphql-api",
    "span.duration.us": 156000, // 156ms
    status_code: "OK",
    timestamp: ago(18 * m),
  },
];

// Mock Entities (Services, Hosts, Process Groups)
export const MOCK_ENTITIES: Entity[] = [
  {
    "entity.id": "SERVICE-payment-service",
    "entity.name": "payment-service",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "SERVICE-order-service",
    "entity.name": "order-service",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "SERVICE-user-service",
    "entity.name": "user-service",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "SERVICE-api-gateway",
    "entity.name": "api-gateway",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "SERVICE-auth-service",
    "entity.name": "auth-service",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "SERVICE-cache-service",
    "entity.name": "cache-service",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "SERVICE-billing-service",
    "entity.name": "billing-service",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "SERVICE-inventory-service",
    "entity.name": "inventory-service",
    "entity.type": "SERVICE",
  },
  {
    "entity.id": "HOST-abc123",
    "entity.name": "prod-api-01.internal.company.com",
    "entity.type": "HOST",
  },
  {
    "entity.id": "HOST-def456",
    "entity.name": "prod-db-primary.internal.company.com",
    "entity.type": "HOST",
  },
  {
    "entity.id": "HOST-ghi789",
    "entity.name": "prod-cache-01.internal.company.com",
    "entity.type": "HOST",
  },
  {
    "entity.id": "PG-payment-java",
    "entity.name": "payment-service-java-processes",
    "entity.type": "PROCESS_GROUP",
  },
  {
    "entity.id": "PG-order-nodejs",
    "entity.name": "order-service-nodejs-processes",
    "entity.type": "PROCESS_GROUP",
  },
  {
    "entity.id": "PG-user-python",
    "entity.name": "user-service-python-processes",
    "entity.type": "PROCESS_GROUP",
  },
];

// Mock Saved Queries
export const MOCK_SAVED_QUERIES: SavedQuery[] = [
  {
    id: "query-001",
    name: "Error logs last 24h",
    dql: 'fetch logs | filter loglevel == "ERROR" | sort timestamp desc | limit 100',
    timeframe: "24h",
    createdAt: ago(3 * d),
    isFavorite: true,
  },
  {
    id: "query-002",
    name: "Payment service latency",
    dql: 'fetch spans | filter service.name == "payment-service" | fields service.name, "span.duration.us", status_code | sort timestamp desc | limit 50',
    timeframe: "1h",
    createdAt: ago(5 * d),
    isFavorite: true,
  },
  {
    id: "query-003",
    name: "Database connection issues",
    dql: 'fetch logs | filter content contains "connection" and loglevel == "ERROR" | stats count() as error_count',
    timeframe: "4h",
    createdAt: ago(7 * d),
    isFavorite: false,
  },
  {
    id: "query-004",
    name: "Deployment timeline",
    dql: 'fetch events | filter event.type == "CUSTOM_DEPLOYMENT" or event.kind == "DAVIS_DEPLOYMENT" | sort event.start desc | limit 30',
    timeframe: "7d",
    createdAt: ago(2 * d),
    isFavorite: false,
  },
  {
    id: "query-005",
    name: "OOM errors across services",
    dql: 'fetch logs | filter content contains "Out of memory" or content contains "JVM heap space" | fields service.name, timestamp, content | sort timestamp desc',
    timeframe: "7d",
    createdAt: ago(10 * d),
    isFavorite: true,
  },
];
