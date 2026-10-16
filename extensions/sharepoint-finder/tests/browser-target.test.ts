import assert from "node:assert/strict";
import test from "node:test";
import { resolveBrowserTarget } from "../src/browser-target.ts";
import type { BrowserDiagnostics } from "../src/browser-target.ts";
import { parseSharePointLocation, toLocalPath } from "../src/sharepoint.ts";

const folderUrl =
  "https://four12global.sharepoint.com/sites/creative.branding/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2Fcreative%2Ebranding%2FShared%20Documents%2FWebsite%2FFAQ%2FFeatured%20Image%2FDrafts&p=true&ga=1";

test("prefers the active SharePoint tab without reading the clipboard", async () => {
  const tab = { url: folderUrl, title: "Drafts", active: true };
  const target = await resolveBrowserTarget(
    async () => [tab],
    async () => {
      throw new Error("Clipboard should not be read");
    },
  );
  assert.deepEqual(target, tab);
});

test("uses a copied link when no browser tabs are available", async () => {
  assert.deepEqual(
    await resolveBrowserTarget(
      async () => [],
      async () => ` ${folderUrl}\n`,
    ),
    { url: folderUrl },
  );
});

test("uses a copied link when the browser connection throws", async () => {
  assert.deepEqual(
    await resolveBrowserTarget(
      async () => {
        throw new Error("Browser disconnected");
      },
      async () => folderUrl,
    ),
    { url: folderUrl },
  );
});

test("does not open an inactive SharePoint tab instead of the copied link", async () => {
  assert.deepEqual(
    await resolveBrowserTarget(
      async () => [
        { url: "https://contoso.sharepoint.com/sites/other", active: false },
        { url: "https://example.com", active: true },
      ],
      async () => folderUrl,
    ),
    { url: folderUrl },
  );
});

test("rejects unrelated, malformed, insecure, or embedded clipboard URLs", async () => {
  for (const value of [
    undefined,
    "",
    "plain text",
    "https://example.com",
    "http://contoso.sharepoint.com",
    "https://contoso.sharepoint.com.example.com",
    `Open ${folderUrl}`,
  ]) {
    await assert.rejects(
      resolveBrowserTarget(
        async () => [],
        async () => value,
      ),
      /Copy the file or folder URL/,
    );
  }
});

test("keeps the connection error as the cause for diagnostics", async () => {
  const error = new Error("Browser disconnected");
  await assert.rejects(
    resolveBrowserTarget(
      async () => {
        throw error;
      },
      async () => undefined,
    ),
    (failure: Error) => failure.cause === error,
  );
});

test("maps the reported Drafts link to its synced folder", async () => {
  const target = await resolveBrowserTarget(
    async () => [],
    async () => folderUrl,
  );
  const location = parseSharePointLocation(target.url);
  assert.equal(
    toLocalPath("/OneDrive", "Creative - Documents", location.relativeSegments),
    "/OneDrive/Creative - Documents/Website/FAQ/Featured Image/Drafts",
  );
});

test("recognizes a Microsoft sign-in tab and records only tab domains", async () => {
  const reports: BrowserDiagnostics[] = [];
  await assert.rejects(
    resolveBrowserTarget(
      async () => [
        {
          url: "https://login.microsoftonline.com/tenant/oauth2/authorize?token=private",
          title: "Private title",
          active: true,
        },
      ],
      async () => "Private clipboard text",
      (report) => reports.push(report),
    ),
    /Sign in to SharePoint/,
  );
  assert.deepEqual(reports, [
    {
      browserStatus: "connected",
      tabCount: 1,
      activeTabHosts: ["login.microsoftonline.com"],
      source: "none",
    },
  ]);
});

test("distinguishes a disconnected browser from an empty tab list", async () => {
  const reports: BrowserDiagnostics[] = [];
  await resolveBrowserTarget(
    async () => {
      throw new Error("Not connected");
    },
    async () => folderUrl,
    (report) => reports.push(report),
  );
  await resolveBrowserTarget(
    async () => [],
    async () => folderUrl,
    (report) => reports.push(report),
  );
  assert.deepEqual(reports, [
    {
      browserStatus: "unavailable",
      tabCount: 0,
      activeTabHosts: [],
      source: "clipboard",
    },
    {
      browserStatus: "connected",
      tabCount: 0,
      activeTabHosts: [],
      source: "clipboard",
    },
  ]);
});
