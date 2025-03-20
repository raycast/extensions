// check if vite dev mode

export const config = true
  ? ({
      env: "dev",
      auth: {
        clientId: "cli_01JN7ER9SNPQRWB42BF2Y183C1",
        authorizeUrl: "https://auth.dev.terminal.shop/authorize",
        tokenUrl: "https://auth.dev.terminal.shop/token",
        refreshTokenUrl: "https://auth.dev.terminal.shop/token",
      },
    } as const)
  : ({
      env: "production",
      auth: {
        clientId: "cli_01JEYAC1R0Q23WRGV9W81EBWW7",
        authorizeUrl: "https://auth.terminal.shop/authorize",
        tokenUrl: "https://auth.terminal.shop/token",
        refreshTokenUrl: "https://auth.terminal.shop/token",
      },
    } as const);
