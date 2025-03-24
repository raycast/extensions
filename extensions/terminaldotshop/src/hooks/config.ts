import { environment } from "@raycast/api";

export const config = environment.isDevelopment
  ? {
      env: "dev",
      auth: {
        clientId: "cli_01JN7ER9SNPQRWB42BF2Y183C1",
        authorizeUrl: "https://auth.dev.terminal.shop/authorize",
        tokenUrl: "https://auth.dev.terminal.shop/token",
        refreshTokenUrl: "https://auth.dev.terminal.shop/token",
      },
    }
  : {
      env: "production",
      auth: {
        clientId: "cli_01JEYAC1R0Q23WRGV9W81EBWW7",
        authorizeUrl: "https://auth.terminal.shop/authorize",
        tokenUrl: "https://auth.terminal.shop/token",
        refreshTokenUrl: "https://auth.terminal.shop/token",
      },
    };
