import assert from "node:assert/strict";
import test from "node:test";
import {
  generatePackagesConfigXml,
  mergeInstalledAndPinned,
  parseDependencies,
  parseLimitOutputPairs,
  parseODataFeed,
  parseOutdatedOutput,
  parseSourcesOutput,
} from "../src/choco/parser";

test("parseLimitOutputPairs parses valid pipe-delimited lines and skips noise", () => {
  const stdout = [
    "Chocolatey v2.7.5",
    "git|2.56.1",
    "nodejs|26.13.1",
    "12 packages installed.",
    "vscodium.install|1.143.17232",
  ].join("\r\n");

  const pairs = parseLimitOutputPairs(stdout);
  assert.deepEqual(pairs, [
    { id: "git", version: "2.56.1" },
    { id: "nodejs", version: "26.13.1" },
    { id: "vscodium.install", version: "1.143.17232" },
  ]);
});

test("mergeInstalledAndPinned marks pinned packages case-insensitively", () => {
  const installed = [
    { id: "git", version: "2.56.1" },
    { id: "NodeJS", version: "26.13.1" },
  ];
  const pinned = [{ id: "nodejs", version: "26.13.1" }];

  assert.deepEqual(mergeInstalledAndPinned(installed, pinned), [
    { id: "git", version: "2.56.1", pinned: false },
    { id: "NodeJS", version: "26.13.1", pinned: true },
  ]);
});

test("parseOutdatedOutput parses current, available, and pinned status", () => {
  const stdout = [
    "discord|1.0.9269|1.0.9270|false",
    "telegram|7.4.4|7.4.7|true",
    "invalid|line",
  ].join("\n");

  assert.deepEqual(parseOutdatedOutput(stdout), [
    {
      id: "discord",
      currentVersion: "1.0.9269",
      availableVersion: "1.0.9270",
      pinned: false,
    },
    {
      id: "telegram",
      currentVersion: "7.4.4",
      availableVersion: "7.4.7",
      pinned: true,
    },
  ]);
});

test("parseSourcesOutput parses Chocolatey source rows", () => {
  const stdout = [
    "chocolatey|https://community.chocolatey.org/api/v2/|False|||0|False|False|False",
    "internal|https://pkgs.local/nuget|True|buildbot||5|True|False|True",
  ].join("\n");

  assert.deepEqual(parseSourcesOutput(stdout), [
    {
      name: "chocolatey",
      url: "https://community.chocolatey.org/api/v2/",
      disabled: false,
      username: undefined,
      certificate: undefined,
      priority: 0,
      bypassProxy: false,
      allowSelfService: false,
      adminOnly: false,
    },
    {
      name: "internal",
      url: "https://pkgs.local/nuget",
      disabled: true,
      username: "buildbot",
      certificate: undefined,
      priority: 5,
      bypassProxy: true,
      allowSelfService: false,
      adminOnly: true,
    },
  ]);
});

test("parseDependencies formats NuGet dependency string", () => {
  assert.deepEqual(parseDependencies("git.install:[2.56.1]:|7zip.install::"), [
    "git.install ([2.56.1])",
    "7zip.install",
  ]);
  assert.deepEqual(parseDependencies(undefined), []);
});

test("parseODataFeed parses Atom XML entries from Chocolatey v2 API", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title type="text">git</title>
    <summary type="text">Distributed version control system</summary>
    <updated>2026-11-11T11:00:29Z</updated>
    <author><name>The Git Development Community</name></author>
    <m:properties>
      <d:Version>2.56.1</d:Version>
      <d:Title>Git</d:Title>
      <d:Description>Full description here</d:Description>
      <d:Tags>git vcs cli</d:Tags>
      <d:Dependencies>git.install:[2.56.1]:</d:Dependencies>
      <d:DownloadCount m:type="Edm.Int32">20149791</d:DownloadCount>
      <d:GalleryDetailsUrl>https://community.chocolatey.org/packages/git/2.56.1</d:GalleryDetailsUrl>
      <d:IconUrl>https://example.com/git.svg</d:IconUrl>
      <d:IsPrerelease m:type="Edm.Boolean">false</d:IsPrerelease>
      <d:Published m:type="Edm.DateTime">2026-11-11T00:13:57.77</d:Published>
      <d:LicenseUrl>http://www.gnu.org/licenses/old-licenses/gpl-2.0.html</d:LicenseUrl>
      <d:ProjectUrl>https://git-for-windows.github.io/</d:ProjectUrl>
    </m:properties>
  </entry>
</feed>`;

  const packages = parseODataFeed(xml);
  assert.equal(packages.length, 1);
  assert.equal(packages[0].id, "git");
  assert.equal(packages[0].title, "Git");
  assert.equal(packages[0].version, "2.56.1");
  assert.equal(packages[0].downloadCount, 20149791);
  assert.deepEqual(packages[0].tags, ["git", "vcs", "cli"]);
  assert.deepEqual(packages[0].dependencies, ["git.install ([2.56.1])"]);
  assert.equal(packages[0].isPrerelease, false);
});

test("generatePackagesConfigXml creates valid Chocolatey XML with optional versions", () => {
  const xmlWithVersions = generatePackagesConfigXml(
    [{ id: "git&tools", version: "2.56.1", pinned: false }],
    true,
  );
  assert.match(
    xmlWithVersions,
    /<package id="git&amp;tools" version="2\.56\.1" \/>/,
  );

  const xmlWithoutVersions = generatePackagesConfigXml(
    [{ id: "7zip", version: "24.09", pinned: false }],
    false,
  );
  assert.match(xmlWithoutVersions, /<package id="7zip" \/>/);
});
