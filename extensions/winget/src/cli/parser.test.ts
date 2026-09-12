import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  interpretOperationResult,
  parseInstalledPackages,
  parsePackageDetails,
  parsePinnedPackages,
  parseSearchResults,
  parseUpgradePackages,
  parseVersionList,
} from "./parser";
import { filterLoadingAnimation } from "./spawn";

/** Real winget 1.28 outputs captured on a live machine (raw, incl. spinner frames). */
function fixture(name: string): string {
  return filterLoadingAnimation(readFileSync(join(__dirname, "__fixtures__", name), "utf-8"));
}

describe("parseSearchResults", () => {
  it("parses results and filters unsupported sources", () => {
    const output = `
Name              Id                 Version   Source
------------------------------------------------------
Git               Git.Git            2.52.0    winget
My Git            9NLVK2SL2SSP       Unknown   msstore
Custom Tool       Custom.Tool        1.0.0     custom
Steam App         ARP\\Machine\\X64\\Steam App 1.0.0
`;

    const { items } = parseSearchResults(output);

    expect(items).toEqual([
      {
        name: "Git",
        id: "Git.Git",
        version: "2.52.0",
        source: "winget",
        truncatedFields: undefined,
      },
      {
        name: "My Git",
        id: "9NLVK2SL2SSP",
        version: "Unknown",
        source: "msstore",
        truncatedFields: undefined,
      },
    ]);
  });

  it("returns empty result for unparseable output", () => {
    expect(parseSearchResults("No package found matching input criteria.").items).toEqual([]);
    expect(parseSearchResults("").items).toEqual([]);
  });

  it("parses a real targeted search with the Match column", () => {
    const { items } = parseSearchResults(fixture("search-git-match-column.raw.txt"));
    expect(items.length).toBeGreaterThan(10);
    const git = items.find((p) => p.id === "Git.Git");
    expect(git?.name).toBe("Git");
    expect(git?.source).toBe("winget");
  });

  it("slices CJK rows by display width (wide chars occupy two cells)", () => {
    const output = `
Name                                     Id                                        Version        Source
---------------------------------------------------------------------------------------------------------
115浏览器                                115.115Chrome                             36.0.0         winget
Git                                      Git.Git                                   2.52.0         winget
`;

    const { items } = parseSearchResults(output);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: "115浏览器",
      id: "115.115Chrome",
      version: "36.0.0",
      source: "winget",
    });
  });

  it("drops rows with truncated IDs and reports them in stats", () => {
    const output = `
Name              Id                 Version   Source
------------------------------------------------------
Long Package      Some.Very.Long.I…  1.0.0     winget
Git               Git.Git            2.52.0    winget
`;

    const { items, stats } = parseSearchResults(output);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("Git.Git");
    expect(stats.droppedTruncatedIds).toBe(1);
  });

  it("flags truncated names and strips the ellipsis", () => {
    const output = `
Name              Id                 Version   Source
------------------------------------------------------
Microsoft Visua…  Microsoft.VCRedis  12.0.4    winget
`;

    const { items } = parseSearchResults(output);
    expect(items[0]?.name).toBe("Microsoft Visua");
    expect(items[0]?.truncatedFields).toEqual(["name"]);
  });

  it("maps CJK localized headers to canonical columns (code-unit vs display-cell offsets)", () => {
    // zh-CN-style header: column names are wide characters, so their
    // code-unit indices differ from their display-cell offsets. Rows are
    // sliced by display cells; header offsets must be remapped to match.
    const output = `
名称              标识符             版本      源
------------------------------------------------------
Git               Git.Git            2.52.0    winget
`;

    const { items } = parseSearchResults(output);
    expect(items).toEqual([
      {
        name: "Git",
        id: "Git.Git",
        version: "2.52.0",
        source: "winget",
        truncatedFields: undefined,
      },
    ]);
  });

  it("maps localized (non-English) headers to canonical columns by position", () => {
    const output = `
Nom               Identifiant        Version   Source
------------------------------------------------------
Git               Git.Git            2.52.0    winget
`;

    const { items } = parseSearchResults(output);
    expect(items).toEqual([
      {
        name: "Git",
        id: "Git.Git",
        version: "2.52.0",
        source: "winget",
        truncatedFields: undefined,
      },
    ]);
  });

  it("resolves single-space column boundaries in localized headers from the rows", () => {
    // winget pads each column to max(widest value, header name width) + 1:
    // when the localized header name is wider than every value beneath it,
    // adjacent header names are separated by a SINGLE space. Here "Version"
    // and "Disponible" are wider than their values, so the header reads
    // "Version Disponible Source" with single spaces (real French layout).
    const output = `
Nom               ID                  Version Disponible Source
---------------------------------------------------------------
Stardock Curtains Stardock.Curtains   1.2     1.19.1     winget
Notepad++         Notepad++.Notepad++ 8.5.8   8.6.0      winget
2 mises à niveau disponibles.
`;

    const { items } = parseUpgradePackages(output);
    expect(items).toEqual([
      {
        name: "Stardock Curtains",
        id: "Stardock.Curtains",
        version: "1.2",
        available: "1.19.1",
        source: "winget",
        truncatedFields: undefined,
      },
      {
        name: "Notepad++",
        id: "Notepad++.Notepad++",
        version: "8.5.8",
        available: "8.6.0",
        source: "winget",
        truncatedFields: undefined,
      },
    ]);
  });

  it("rejects partially-English localized headers instead of dropping the localized columns", () => {
    // German headers contain the English words Name, ID, and Version next to
    // Verfügbar and Quelle. Trusting the English keywords alone would build a
    // 3-column table whose rows all fail source validation.
    const output = `
Name              ID                  Version    Verfügbar  Quelle
-------------------------------------------------------------------
Stardock Curtains Stardock.Curtains   1.2        1.19.1     winget
2 Aktualisierungen verfügbar.
`;

    const { items } = parseUpgradePackages(output);
    expect(items).toEqual([
      {
        name: "Stardock Curtains",
        id: "Stardock.Curtains",
        version: "1.2",
        available: "1.19.1",
        source: "winget",
        truncatedFields: undefined,
      },
    ]);
  });
});

describe("parseInstalledPackages", () => {
  it("filters ARP-like entries and cleans version prefix", () => {
    const output = `
Name              Id                 Version      Available   Source
--------------------------------------------------------------------
Git               Git.Git            2.52.0                   winget
VS Community      Microsoft.VS       < 17.14.25   17.14.25    winget
Steam Game        ARP\\Machine\\X64\\Steam App 12345 Unknown
`;

    const { items } = parseInstalledPackages(output);

    expect(items).toEqual([
      {
        name: "Git",
        id: "Git.Git",
        version: "2.52.0",
        available: undefined,
        source: "winget",
        truncatedFields: undefined,
      },
      {
        name: "VS Community",
        id: "Microsoft.VS",
        version: "17.14.25",
        available: "17.14.25",
        source: "winget",
        truncatedFields: undefined,
      },
    ]);
  });

  it("filters entries without source", () => {
    const output = `
Name              Id                 Version      Source
--------------------------------------------------------------------
No Source Pkg     Some.Pkg           1.0.0
Git               Git.Git            2.52.0       winget
`;

    const { items } = parseInstalledPackages(output);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("Git.Git");
  });

  it("parses a real 290-row winget list capture (truncation, MSIX/ARP noise)", () => {
    const { items } = parseInstalledPackages(fixture("list-truncated.raw.txt"));
    expect(items.length).toBeGreaterThan(20);
    // Every kept row is actionable: valid source, no truncated id.
    for (const item of items) {
      expect(["winget", "msstore"]).toContain(item.source);
      expect(item.id.endsWith("…")).toBe(false);
    }
    // Known truncated-name winget row is kept with the name flagged.
    const vcRedist = items.find((p) => p.id === "Microsoft.VCRedist.2013.x64");
    expect(vcRedist).toBeDefined();
    expect(vcRedist?.truncatedFields).toContain("name");
  });
});

describe("parseUpgradePackages", () => {
  it("requires available version and valid source", () => {
    const output = `
Name              Id                 Version      Available   Source
--------------------------------------------------------------------
Git               Git.Git            2.52.0       2.53.0      winget
No Available      No.Available       1.0.0                    winget
Other Source      Other.Source        1.0.0        1.1.0       custom
`;

    const { items } = parseUpgradePackages(output);

    expect(items).toEqual([
      {
        name: "Git",
        id: "Git.Git",
        version: "2.52.0",
        available: "2.53.0",
        source: "winget",
        truncatedFields: undefined,
      },
    ]);
  });

  it("parses BOTH tables of real multi-table upgrade output, tagging explicit-targeting rows", () => {
    const { items } = parseUpgradePackages(fixture("upgrade-multitable.raw.txt"));

    const main = items.filter((p) => !p.requiresExplicitTargeting);
    const explicit = items.filter((p) => p.requiresExplicitTargeting);

    expect(main.length).toBe(5);
    expect(main.map((p) => p.id)).toContain("OpenAI.Codex");
    // The second "require explicit targeting" table must not be dropped or garbled.
    expect(explicit.map((p) => p.id)).toEqual(["Discord.Discord"]);
    expect(explicit[0]?.available).toBe("1.0.9241");
  });

  it("excludes unknown-version section rows", () => {
    const output = `
Name              Id                 Version      Available   Source
--------------------------------------------------------------------
Git               Git.Git            2.52.0       2.53.0      winget
The following packages have version numbers that cannot be determined. Use --include-unknown to see all results.
Name              Id                 Version      Available   Source
--------------------------------------------------------------------
Mystery           Mystery.App        Unknown      1.0.0       winget
`;

    const { items } = parseUpgradePackages(output);
    expect(items.map((p) => p.id)).toEqual(["Git.Git"]);
  });
});

describe("parsePackageDetails", () => {
  it("parses full details including multiline description and tags", () => {
    const output = `Found GIMP [GIMP.GIMP.3]
Version: 3.0.6.1
Publisher: The GIMP Team
Author: The GIMP Team
Moniker: gimp
Description:
  GIMP is an acronym for GNU Image Manipulation Program.
  It is free software.
Homepage: https://www.gimp.org/downloads/
License: GPL-3.0
Release Date: 2025-10-07
Tags:
    edit
    image
`;

    const result = parsePackageDetails(output);

    expect(result).toEqual({
      id: "GIMP.GIMP.3",
      name: "GIMP",
      version: "3.0.6.1",
      publisher: "The GIMP Team",
      author: "The GIMP Team",
      moniker: "gimp",
      description: "GIMP is an acronym for GNU Image Manipulation Program.\nIt is free software.",
      homepage: "https://www.gimp.org/downloads/",
      license: "GPL-3.0",
      releaseDate: "2025-10-07",
      tags: ["edit", "image"],
    });
  });

  it("returns null for output without Found header", () => {
    expect(parsePackageDetails("No package found matching input criteria.")).toBeNull();
    expect(parsePackageDetails("")).toBeNull();
  });

  it("parses minimal details (only required fields)", () => {
    const result = parsePackageDetails(`Found Git [Git.Git]\nVersion: 2.52.0\n`);
    expect(result).toEqual({ id: "Git.Git", name: "Git", version: "2.52.0" });
  });

  it("parses a real CJK show capture (Found line not on line 0)", () => {
    const result = parsePackageDetails(fixture("show-cjk.raw.txt"));
    expect(result?.id).toBe("115.115Chrome");
    expect(result?.name).toContain("115");
    expect(result?.version).toBeTruthy();
  });

  it("parses localized labels (French, space before the colon)", () => {
    const output = `Trouvé Git [Git.Git]
Version : 2.52.0
Publisher : The Git Development Community
Auteur : Johannes Schindelin
Page d’accueil : https://gitforwindows.org
Licence : GPL-2.0
Date de version : 2025-11-24
Description : Git for Windows
Mots-clés :
    vcs
`;

    expect(parsePackageDetails(output)).toEqual({
      id: "Git.Git",
      name: "Git",
      version: "2.52.0",
      publisher: "The Git Development Community",
      author: "Johannes Schindelin",
      homepage: "https://gitforwindows.org",
      license: "GPL-2.0",
      releaseDate: "2025-11-24",
      description: "Git for Windows",
      tags: ["vcs"],
    });
  });

  it("parses localized labels (Korean colonless homepage, fullwidth colons)", () => {
    const output = `찾음 Git [Git.Git]
버전: 2.52.0
게시자: The Git Development Community
홈페이지 https://gitforwindows.org
标记：
    vcs
`;

    expect(parsePackageDetails(output)).toEqual({
      id: "Git.Git",
      name: "Git",
      version: "2.52.0",
      publisher: "The Git Development Community",
      homepage: "https://gitforwindows.org",
      tags: ["vcs"],
    });
  });
});

describe("parseVersionList", () => {
  it("parses version list", () => {
    const output = `
Found GIMP [GIMP.GIMP.3]
Version
-------
3.0.6.1
3.0.6.0
`;

    expect(parseVersionList(output)).toEqual({
      id: "GIMP.GIMP.3",
      name: "GIMP",
      versions: ["3.0.6.1", "3.0.6.0"],
    });
  });

  it("returns null for output without separator", () => {
    expect(parseVersionList("No package found")).toBeNull();
  });

  it("parses a real show --versions capture", () => {
    const result = parseVersionList(fixture("show-versions.raw.txt"));
    expect(result?.id).toBe("Git.Git");
    expect(result!.versions.length).toBeGreaterThan(3);
  });

  it("parses a localized identity line (the Found verb is translated)", () => {
    const output = `
Trouvé GIMP [GIMP.GIMP.3]
Version
-------
3.0.6.1
3.0.6.0
`;

    expect(parseVersionList(output)).toEqual({
      id: "GIMP.GIMP.3",
      name: "GIMP",
      versions: ["3.0.6.1", "3.0.6.0"],
    });
  });
});

describe("parsePinnedPackages", () => {
  it("parses pinned package list", () => {
    const output = `
Name              Id                 Version   Source
------------------------------------------------------
PowerToys         Microsoft.PowerToys          winget
Git               Git.Git            2.52.0    winget
`;

    const { items } = parsePinnedPackages(output);

    expect(items).toEqual([
      { id: "Microsoft.PowerToys", version: undefined, source: "winget" },
      { id: "Git.Git", version: "2.52.0", source: "winget" },
    ]);
  });

  it("filters entries without valid source", () => {
    const output = `
Name              Id                 Version   Source
------------------------------------------------------
Custom            Custom.Pkg         1.0.0     custom
Git               Git.Git            2.52.0    winget
`;

    const { items } = parsePinnedPackages(output);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("Git.Git");
  });

  it("parses the real pin list format with Pin type column and solid separator", () => {
    const { items } = parsePinnedPackages(fixture("pin-list.raw.txt"));
    expect(items).toEqual([{ id: "jqlang.jq", version: "1.8.1", source: "winget" }]);
  });

  it("merges multi-word localized headers whose later words overhang the values", () => {
    // Spanish pin list: single space between Origen and Tipo (equal-width
    // values), and "anclaje" starts beyond "Pinning"/"Gating" so no row has
    // content beneath it — it must not open a phantom column.
    const output = `
Nombre Id               Versión     Origen Tipo de anclaje
----------------------------------------------------------
Git    Git.Git          2.52.0      winget Pinning
Claude Anthropic.Claude 1.20186.0.0 winget Gating
`;

    const { items } = parsePinnedPackages(output);
    expect(items).toEqual([
      { id: "Git.Git", version: "2.52.0", source: "winget" },
      { id: "Anthropic.Claude", version: "1.20186.0.0", source: "winget" },
    ]);
  });
});

describe("interpretOperationResult — exit-code-first", () => {
  it("exit 0 with completed work is success, not noop, despite an already-installed preamble", () => {
    const buffer = `Found an existing package already installed. Trying to upgrade the installed package...
Starting package install...
Successfully installed`;
    const result = interpretOperationResult(0, buffer);
    expect(result).toMatchObject({ success: true, noop: false });
  });

  it("exit 0 with only the already-installed prose is a noop", () => {
    const result = interpretOperationResult(0, "No newer package versions are available from the configured sources.");
    expect(result).toMatchObject({ success: true, noop: true });
  });

  it("nonzero exit is a failure even when a success phrase appeared earlier in the output", () => {
    const buffer = `Trying to upgrade the installed package...
Successfully uninstalled
Installer failed with exit code: 1603`;
    const result = interpretOperationResult(-1978334972, buffer); // INSTALL_MISSING_DEPENDENCY signed
    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("maps official noop exit codes (signed form) without any English text", () => {
    // UPDATE_NOT_APPLICABLE 0x8A15002B as the signed exit code node reports.
    const result = interpretOperationResult(-1978335189, "texte localisé quelconque");
    expect(result).toMatchObject({
      success: true,
      noop: true,
      message: "No applicable update",
    });
  });

  it("maps winget-side cancellation exit codes to failure (cancelled is reserved for our abort)", () => {
    // CTRL_SIGNAL_RECEIVED 0x8A150005
    const result = interpretOperationResult(-1978335227, "");
    expect(result.success).toBe(false);
    expect(result.cancelled).toBeUndefined();
    expect(result.message).toContain("Cancelled");
  });

  it("prefers the curated failure pattern over the generic exit-code message", () => {
    const buffer =
      "A newer version was found, but the install technology is different from the current version installed.";
    const result = interpretOperationResult(-1978335090, buffer); // UPDATE_INSTALL_TECHNOLOGY_MISMATCH
    expect(result.success).toBe(false);
    expect(result.message).toBe("Installer type changed, uninstall first");
  });

  it("extracts embedded error codes and installer log paths", () => {
    const buffer = `Installer failed with exit code: 1603
Installer log is available at: C:\\Users\\me\\AppData\\Local\\Temp\\WinGet\\install.log`;
    const result = interpretOperationResult(1603, buffer);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("1603");
    expect(result.installerLogPath).toContain("install.log");
  });

  it("falls back to a hex-coded message for unknown exit codes", () => {
    const result = interpretOperationResult(-1978334720, "sortie localisée");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/0x8A150/i);
  });

  it("extracts the download path from a real not-found error capture", () => {
    const text = fixture("error-not-found.raw.txt");
    const result = interpretOperationResult(-1978335212, text); // NO_APPLICATIONS_FOUND signed
    expect(result.success).toBe(false);
    expect(result.message).toBe("Package not found");
  });
});
