import assert from "node:assert/strict";
import test from "node:test";
import {
  extractServerRelativePath,
  parseOpaqueSharePointFile,
  parseSharePointLocation,
  rankLocalLibraries,
  rankSharedLibraryRoots,
  toLocalPath,
} from "../src/sharepoint.ts";

const sharedLibrariesPath =
  "/Users/andrewslabbert/Library/CloudStorage/OneDrive-SharedLibraries-Four12Global";
const folderPath =
  "/sites/creative.branding/Shared Documents/Events/Conferences/Conference in South Africa/2026";
const exactUrl =
  "https://four12global.sharepoint.com/sites/creative.branding/Shared%20Documents/Forms/AllItems.aspx?id=/sites/creative.branding/Shared%20Documents/Events/Conferences/Conference%20in%20South%20Africa/2026&p=true&ga=1";
const localLibraries = [
  "Conference RSA 2024 - Documents",
  "Copy - Documents",
  "Creative - Documents",
  "Event Management - Documents",
  "Partnering Programmes - Documents",
  "Photo Gallery - Documents",
  "Platforms - Documents",
  "Resources - Documents",
  "Resources External - Documents",
];

test("parses an opaque SharePoint file link from its browser tab", () => {
  assert.deepEqual(
    parseOpaqueSharePointFile(
      "https://four12global.sharepoint.com/:x:/s/externalresources/IQCVLkupKllwSpLxIbYot-bSAVxymtds7Jb2FODnlr5EQrA?e=g2v29S",
      "FOUR12 Media schedule.xlsx",
    ),
    {
      tenantName: "four12global",
      siteSlug: "externalresources",
      fileName: "FOUR12 Media schedule.xlsx",
    },
  );
});

test("removes an Office suffix from an opaque file tab title", () => {
  assert.equal(
    parseOpaqueSharePointFile(
      "https://contoso.sharepoint.com/:w:/s/communications/token",
      "Weekly Update.docx - Word",
    )?.fileName,
    "Weekly Update.docx",
  );
});

test("does not treat a path-based link as an opaque file", () => {
  assert.equal(parseOpaqueSharePointFile(exactUrl, "2026"), null);
});

test("does not treat an opaque folder link as a file", () => {
  assert.equal(
    parseOpaqueSharePointFile(
      "https://contoso.sharepoint.com/:f:/s/design/token",
      "Campaign Assets",
    ),
    null,
  );
});

test("rejects an opaque file link without an exact filename", () => {
  assert.throws(
    () =>
      parseOpaqueSharePointFile(
        "https://contoso.sharepoint.com/:x:/s/design/token",
        "Microsoft Excel",
      ),
    /did not expose the file name/,
  );
});

test("extracts the folder from SharePoint's id query parameter", () => {
  const url = `https://four12global.sharepoint.com/sites/creative.branding/Shared%20Documents/Forms/AllItems.aspx?id=${encodeURIComponent(folderPath)}`;
  assert.equal(extractServerRelativePath(url), folderPath);
});

test("parses the exact Four12 folder URL", () => {
  assert.deepEqual(parseSharePointLocation(exactUrl), {
    tenantName: "four12global",
    siteSlug: "creative.branding",
    libraryName: "Shared Documents",
    relativeSegments: [
      "Events",
      "Conferences",
      "Conference in South Africa",
      "2026",
    ],
    serverRelativePath: folderPath,
  });
});

test("extracts a folder from a direct SharePoint URL", () => {
  const url = `https://four12global.sharepoint.com/:f:/r${folderPath.replaceAll(" ", "%20")}?csf=1`;
  assert.equal(extractServerRelativePath(url), folderPath);
});

test("extracts a custom library from a direct SharePoint URL", () => {
  const url =
    "https://contoso.sharepoint.com/:f:/r/sites/design/Brand%20Assets/Campaigns?csf=1";
  assert.deepEqual(parseSharePointLocation(url), {
    tenantName: "contoso",
    siteSlug: "design",
    libraryName: "Brand Assets",
    relativeSegments: ["Campaigns"],
    serverRelativePath: "/sites/design/Brand Assets/Campaigns",
  });
});

test("detects Creative from the synced libraries", () => {
  const location = parseSharePointLocation(exactUrl);
  assert.equal(
    rankLocalLibraries(localLibraries, location)[0],
    "Creative - Documents",
  );
});

test("prefers Resources External over Resources", () => {
  const location = {
    tenantName: "example",
    siteSlug: "resources.external",
    libraryName: "Shared Documents",
    relativeSegments: [],
    serverRelativePath: "/sites/resources.external/Shared Documents",
  };
  assert.equal(
    rankLocalLibraries(localLibraries, location)[0],
    "Resources External - Documents",
  );
});

test("prefers an exact reordered site over a partial prefix match", () => {
  const location = {
    tenantName: "four12global",
    siteSlug: "externalresources",
    libraryName: "Shared Documents",
    relativeSegments: [],
    serverRelativePath: "/sites/externalresources/Shared Documents",
  };
  assert.deepEqual(
    rankLocalLibraries([...localLibraries, "External - Documents"], location),
    ["Resources External - Documents"],
  );
});

test("rejects ambiguous reordered site names", () => {
  const location = {
    tenantName: "four12global",
    siteSlug: "externalresources",
    libraryName: "Shared Documents",
    relativeSegments: [],
    serverRelativePath: "/sites/externalresources/Shared Documents",
  };
  assert.deepEqual(
    rankLocalLibraries(
      ["Resources External - Documents", "Resources-External - Documents"],
      location,
    ),
    [],
  );
});

test("does not loosely match a partial reordered site name", () => {
  const location = {
    tenantName: "four12global",
    siteSlug: "externalresourcesarchive",
    libraryName: "Shared Documents",
    relativeSegments: [],
    serverRelativePath: "/sites/externalresourcesarchive/Shared Documents",
  };
  assert.deepEqual(rankLocalLibraries(localLibraries, location), []);
});

test("matches the SharePoint tenant to the correct OneDrive root", () => {
  const roots = [
    "OneDrive-SharedLibraries-Contoso",
    "OneDrive-SharedLibraries-Four12Global",
    "OneDrive-Personal",
  ];
  assert.equal(
    rankSharedLibraryRoots(roots, "four12global")[0],
    "OneDrive-SharedLibraries-Four12Global",
  );
});

test("rejects unrelated OneDrive roots", () => {
  const roots = [
    "OneDrive-SharedLibraries-Contoso",
    "OneDrive-SharedLibraries-Four12Global",
  ];
  assert.deepEqual(rankSharedLibraryRoots(roots, "fabrikam"), []);
});

test("rejects unrelated synced site libraries", () => {
  const location = parseSharePointLocation(exactUrl);
  assert.deepEqual(
    rankLocalLibraries(
      ["Accounts - Documents", "Operations - Documents"],
      location,
    ),
    [],
  );
});

test("supports SharePoint team paths", () => {
  const url =
    "https://contoso.sharepoint.com/teams/Design/Shared%20Documents/Forms/AllItems.aspx?id=/teams/Design/Shared%20Documents/Projects";
  assert.deepEqual(parseSharePointLocation(url), {
    tenantName: "contoso",
    siteSlug: "Design",
    libraryName: "Shared Documents",
    relativeSegments: ["Projects"],
    serverRelativePath: "/teams/Design/Shared Documents/Projects",
  });
});

test("maps beneath the selected synced library", () => {
  assert.equal(
    toLocalPath(sharedLibrariesPath, "Creative - Documents", [
      "Events",
      "Conferences",
      "Conference in South Africa",
      "2026",
    ]),
    `${sharedLibrariesPath}/Creative - Documents/Events/Conferences/Conference in South Africa/2026`,
  );
});

test("rejects a path outside the detected library", () => {
  assert.throws(
    () =>
      toLocalPath(sharedLibrariesPath, "Creative - Documents", [
        "..",
        "Private",
      ]),
    /outside the detected library/,
  );
});
