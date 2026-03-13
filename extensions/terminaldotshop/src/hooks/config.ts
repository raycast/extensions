import { environment } from "@raycast/api";

export function config() {
  return environment.isDevelopment
    ? {
        env: "dev" as const,
        stripe:
          "pk_test_51OrLKuDgGJQx1Mr6CNDnGNukgQwBonSSToYC8VcmE7qBk2YEad8UuitmY54Pqp0tuZCrk8PNP9cEKVYHvuLcjsnv007CKDgOew",
        auth: {
          clientId: "cli_01JN7ER9SNPQRWB42BF2Y183C1",
          authorizeUrl: "https://auth.dev.terminal.shop/authorize",
          tokenUrl: "https://auth.dev.terminal.shop/token",
          refreshTokenUrl: "https://auth.dev.terminal.shop/token",
        },
      }
    : {
        env: "production" as const,
        stripe:
          "pk_live_51OrLKuDgGJQx1Mr6tJbUNOAWOcAZ1gGs2rr6T99REuLD6tPPPfSS6iSZnLAI7Kw0EBR63m8SIcqdeb3vhVRLbqZr00zy2bzLav",
        auth: {
          clientId: "cli_01JEYAC1R0Q23WRGV9W81EBWW7",
          authorizeUrl: "https://auth.terminal.shop/authorize",
          tokenUrl: "https://auth.terminal.shop/token",
          refreshTokenUrl: "https://auth.terminal.shop/token",
        },
      };
}
