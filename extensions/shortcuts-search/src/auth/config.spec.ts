import * as config from "./config";
it("uses the explicit public-client PKCE and database contract", () => {
  expect(config.CLERK_ISSUER).toBe("https://clerk.hotkys.com");
  expect(config.CLERK_AUTHORIZATION_ENDPOINT).toBe(`${config.CLERK_ISSUER}/oauth/authorize`);
  expect(config.CLERK_TOKEN_ENDPOINT).toBe(`${config.CLERK_ISSUER}/oauth/token`);
  expect(config.SUPABASE_PUBLISHABLE_KEY).toMatch(/^sb_publishable_/);
  expect(config.CLERK_OAUTH_SCOPE.split(" ")).toEqual(["profile", "email", "offline_access"]);
  expect(Object.keys(config).some((name) => /SECRET|PASSWORD/.test(name))).toBe(false);
});
