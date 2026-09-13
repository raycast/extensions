import { expect, test } from "bun:test";
import "./raycast-mock";
const { integrationIcon, registrableDomain } = await import("../src/lib/integration-icons");

test("icons follow provider metadata, regardless of integration slug", () => {
  for (const slug of ["custom_service", "github", "supabase"]) {
    expect(integrationIcon(slug, new Map([[slug, { displayUrl: "https://api.example.org/mcp" }]]))).toMatchObject({
      source: "https://integrations.sh/logo/example.org?sz=128",
    });
    expect(integrationIcon(slug)).toMatchObject({ source: "plug" });
  }
});

test("catalog domains take precedence over the display URL fallback", () => {
  const metadata = { kind: "openapi", displayUrl: "https://raw.githubusercontent.com/example/spec/main/openapi.json" };
  expect(integrationIcon("custom_service", new Map([["custom_service", metadata]]))).toMatchObject({
    source: "plug",
  });
  expect(
    integrationIcon("custom_service", new Map([["custom_service", { ...metadata, logoDomain: "example.org" }]])),
  ).toMatchObject({
    source: "https://integrations.sh/logo/example.org?sz=128",
  });
});

test("OpenAPI integrations retain Executor's display-domain logos after being saved or renamed", () => {
  for (const [displayUrl, domain] of [
    ["https://api.example.org", "example.org"],
    ["https://secure.example.net/api/v3.0", "example.net"],
  ]) {
    const metadata = { kind: "openapi", displayUrl, logoDomain: domain };
    for (const slug of ["original", "renamed_integration"]) {
      expect(integrationIcon(slug, new Map([[slug, metadata]]))).toMatchObject({
        source: `https://integrations.sh/logo/${domain}?sz=128`,
        fallback: "plug",
      });
    }
  }
  expect(integrationIcon("unconfigured", new Map([["unconfigured", { kind: "openapi" }]]))).toMatchObject({
    source: "plug",
  });
});

test("each workspace supplies its own logo metadata for the same slug", () => {
  const icon = (displayUrl: string) => integrationIcon("shared", new Map([["shared", { displayUrl }]]));
  expect(icon("https://api.example.org/mcp")).not.toEqual(icon("https://api.example.net/mcp"));
  expect(integrationIcon("executor")).toEqual({ source: "extension_icon.png" });
});

test("domain parsing covers public suffixes without exposing local hosts or URL parameters", () => {
  expect(registrableDomain("https://api.example.co.za/mcp?token=synthetic")).toBe("example.co.za");
  expect(registrableDomain("https://api.example.com.au/mcp")).toBe("example.com.au");
  for (const url of [
    "http://127.0.0.1:8080",
    "http://localhost",
    "https://service.internal",
    "https://user:password@example.org",
    "file:///tmp/spec.json",
    "not a URL",
  ]) {
    expect(registrableDomain(url)).toBeNull();
  }
});

test("upstream artwork resolves GitHub specs and Google APIs by URL even after renaming", () => {
  const icons = [
    [
      "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
      "https://integrations.sh/logo/github.com",
    ],
    [
      "https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest",
      "https://fonts.gstatic.com/s/i/productlogos/sheets_2020q4/v8/192px.svg",
    ],
    [
      "https://sheets.googleapis.com/v4/spreadsheets",
      "https://fonts.gstatic.com/s/i/productlogos/sheets_2020q4/v8/192px.svg",
    ],
  ];
  for (const [displayUrl, source] of icons) {
    expect(integrationIcon("renamed", new Map([["renamed", { kind: "openapi", displayUrl }]]))).toMatchObject({
      source,
    });
  }
  for (const displayUrl of [
    "https://www.googleapis.com.evil.example.org/discovery/v1/apis/sheets/v4/rest",
    "https://user:secret@www.googleapis.com/discovery/v1/apis/sheets/v4/rest",
  ]) {
    expect(
      integrationIcon("google_sheets", new Map([["google_sheets", { kind: "openapi", displayUrl }]])),
    ).toMatchObject({ source: "plug" });
  }
});
