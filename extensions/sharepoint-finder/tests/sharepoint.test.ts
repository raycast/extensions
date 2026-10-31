import assert from "node:assert/strict";
import test from "node:test";
import {
  extractServerRelativePath,
  parseSharePointLocation,
  parseSharePointTarget,
  rankLocalLibraries,
  rankLocalSiteLibraries,
  rankSharedLibraryRoots,
  toLocalPath,
  toLocalPaths,
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
    parseSharePointTarget(
      "https://four12global.sharepoint.com/:x:/s/externalresources/IQCVLkupKllwSpLxIbYot-bSAVxymtds7Jb2FODnlr5EQrA?e=g2v29S",
      "FOUR12 Media schedule.xlsx",
    ),
    {
      kind: "shared-file",
      tenantName: "four12global",
      siteSlug: "externalresources",
      fileName: "FOUR12 Media schedule.xlsx",
    },
  );
});

test("removes an Office suffix from an opaque file tab title", () => {
  assert.deepEqual(
    parseSharePointTarget(
      "https://contoso.sharepoint.com/:w:/s/communications/token",
      "Weekly Update.docx - Word",
    ),
    {
      kind: "shared-file",
      tenantName: "contoso",
      siteSlug: "communications",
      fileName: "Weekly Update.docx",
    },
  );
});

test("does not treat a path-based link as an opaque file", () => {
  assert.equal(parseSharePointTarget(exactUrl, "2026").kind, "path");
});

test("does not treat an opaque folder link as a file", () => {
  assert.throws(
    () =>
      parseSharePointTarget(
        "https://contoso.sharepoint.com/:f:/s/design/token",
        "Campaign Assets",
      ),
    /finish opening/,
  );
});

test("rejects an opaque file link without an exact filename", () => {
  assert.throws(
    () =>
      parseSharePointTarget(
        "https://contoso.sharepoint.com/:x:/s/design/token",
        "Microsoft Excel",
      ),
    /did not expose the file name/,
  );
});

test("finds every synced library belonging to an opaque link's site", () => {
  assert.deepEqual(
    rankLocalSiteLibraries(
      [
        ...localLibraries,
        "Resources External - Brand Assets",
        "External - Documents",
      ],
      "externalresources",
    ),
    ["Resources External - Documents", "Resources External - Brand Assets"],
  );
});

test("supports a partial site name when finding possible libraries", () => {
  assert.deepEqual(
    rankLocalSiteLibraries(localLibraries, "creative.branding"),
    ["Creative - Documents"],
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

test("tries literal URL names before decoded SharePoint names", () => {
  const url =
    "https://four12global.sharepoint.com/sites/creative.branding/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2Fcreative.branding%2FShared%20Documents%2FEvents%2FConferences%2FConference%20in%20South%20Africa%2F2026%2FAndrew%20Session%20%26%23x7c%3B%20Leaders%20and%20Conference%2FLeaders%20Time%2FFinal";
  const location = parseSharePointLocation(url);
  const basePath = `${sharedLibrariesPath}/Creative - Documents/Events/Conferences/Conference in South Africa/2026`;

  assert.deepEqual(
    toLocalPaths(
      sharedLibrariesPath,
      "Creative - Documents",
      location.relativeSegments,
    ),
    [
      `${basePath}/Andrew Session &#x7c; Leaders and Conference/Leaders Time/Final`,
      `${basePath}/Andrew Session | Leaders and Conference/Leaders Time/Final`,
    ],
  );
});

test("decodes other numeric HTML entities in local name fallbacks", () => {
  assert.deepEqual(
    toLocalPaths(sharedLibrariesPath, "Creative - Documents", [
      "R&#38;D",
      "A&#x2013;Z",
    ]),
    [
      `${sharedLibrariesPath}/Creative - Documents/R&#38;D/A&#x2013;Z`,
      `${sharedLibrariesPath}/Creative - Documents/R&D/A–Z`,
    ],
  );
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
  assert.throws(
    () =>
      rankLocalLibraries(
        ["Resources External - Documents", "Resources-External - Documents"],
        location,
      ),
    /More than one synced site/,
  );
});

test("rejects multiple partial site matches instead of choosing the highest score", () => {
  const location = parseSharePointLocation(exactUrl);
  assert.throws(
    () =>
      rankLocalLibraries(
        ["Creative - Documents", "Creative Branding Archive - Documents"],
        location,
      ),
    /More than one synced site matches creative.branding/,
  );
});

test("prefers an exact site over partial matches", () => {
  const location = parseSharePointLocation(exactUrl);
  assert.deepEqual(
    rankLocalLibraries(
      [
        "Creative - Documents",
        "Creative Branding - Documents",
        "Creative Branding Archive - Documents",
      ],
      location,
    ),
    ["Creative Branding - Documents"],
  );
});

test("retains the actual synced library name and suffix casing", () => {
  const location = parseSharePointLocation(exactUrl);
  assert.deepEqual(rankLocalLibraries(["Creative - DOCUMENTS"], location), [
    "Creative - DOCUMENTS",
  ]);
});

test("rejects multiple libraries matching one site's requested library", () => {
  const location = parseSharePointLocation(exactUrl);
  assert.throws(
    () =>
      rankLocalLibraries(
        ["Creative - Documents", "Creative - DOCUMENTS"],
        location,
      ),
    /More than one synced library/,
  );
});

test("rejects ambiguous sites before searching an opaque file's libraries", () => {
  assert.throws(
    () =>
      rankLocalSiteLibraries(
        ["Creative - Documents", "Creative Branding Archive - Brand Assets"],
        "creative.branding",
      ),
    /More than one synced site/,
  );
});

test("allows multiple libraries within one uniquely matched site", () => {
  assert.deepEqual(
    rankLocalSiteLibraries(
      [
        "Creative Branding - Documents",
        "Creative Branding - Brand Assets",
        "Creative - Documents",
      ],
      "creative.branding",
    ),
    ["Creative Branding - Documents", "Creative Branding - Brand Assets"],
  );
});

test("rejects exact site names that normalize to the same slug", () => {
  assert.throws(
    () =>
      rankLocalSiteLibraries(
        ["Creative Branding - Documents", "Creative.Branding - Brand Assets"],
        "creative.branding",
      ),
    /More than one synced site/,
  );
});

test("rejects ambiguous tenants before probing their libraries", () => {
  assert.throws(
    () =>
      rankSharedLibraryRoots(
        [
          "OneDrive-SharedLibraries-Four12",
          "OneDrive-SharedLibraries-Four12GlobalArchive",
        ],
        "four12global",
      ),
    /More than one synced tenant/,
  );
});

test("prefers the exact tenant over partial tenant names", () => {
  assert.deepEqual(
    rankSharedLibraryRoots(
      [
        "OneDrive-SharedLibraries-Four12",
        "OneDrive-SharedLibraries-Four12Global",
        "OneDrive-SharedLibraries-Four12GlobalArchive",
      ],
      "four12global",
    ),
    ["OneDrive-SharedLibraries-Four12Global"],
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
