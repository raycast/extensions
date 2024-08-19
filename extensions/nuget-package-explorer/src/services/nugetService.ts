import { XMLParser } from "fast-xml-parser";
import { INugetPackage } from "./interfaces";
import fs from "fs";

const packagesPath = `${process.env.HOME}/.nuget/packages`;

function parseNuGetVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  build: number;
  suffix?: string;
  suffixNumber?: number;
} {
  const [versionPart, suffixPart] = version.split("-");
  const [major, minor, patch, build] = versionPart.split(".").map(Number);
  const [suffix, suffixNumber] = suffixPart?.split(".") || ["", "0"];
  return { major, minor, patch, build, suffix, suffixNumber: parseInt(suffixNumber) };
}

function compareNuGetVersions(versionA: string, versionB: string): number {
  const parsedVersionA = parseNuGetVersion(versionA);
  const parsedVersionB = parseNuGetVersion(versionB);

  if (parsedVersionA.major !== parsedVersionB.major) {
    return parsedVersionA.major - parsedVersionB.major;
  }
  if (parsedVersionA.minor !== parsedVersionB.minor) {
    return parsedVersionA.minor - parsedVersionB.minor;
  }
  if (parsedVersionA.patch !== parsedVersionB.patch) {
    return parsedVersionA.patch - parsedVersionB.patch;
  }
  if (parsedVersionA.build !== parsedVersionB.build) {
    return parsedVersionA.patch - parsedVersionB.patch;
  }
  if (parsedVersionA.suffix && !parsedVersionB.suffix) {
    return -1;
  }
  if (!parsedVersionA.suffix && parsedVersionB.suffix) {
    return 1;
  }
  if (parsedVersionA.suffix && parsedVersionB.suffix) {
    if (parsedVersionA.suffix !== parsedVersionB.suffix) {
      return parsedVersionA.suffix.localeCompare(parsedVersionB.suffix);
    }
    if (parsedVersionA.suffixNumber && !parsedVersionB.suffixNumber) {
      return -1;
    }
    if (!parsedVersionA.suffixNumber && parsedVersionB.suffixNumber) {
      return 1;
    }
    if (
      parsedVersionA.suffixNumber &&
      parsedVersionB.suffixNumber &&
      parsedVersionA.suffixNumber !== parsedVersionB.suffixNumber
    ) {
      return parsedVersionA.suffixNumber - parsedVersionB.suffixNumber;
    }
  }

  return 0;
}

export default {
  getNugetPackagesAsync: async (): Promise<INugetPackage[]> => {
    if (!fs.existsSync(packagesPath)) return [];
    const packages: INugetPackage[] = [];
    fs.readdirSync(packagesPath).forEach((packageId) => {
      if (packageId === ".DS_Store") return;
      const pkg: INugetPackage = {
        id: packageId,
        name: packageId,
        path: `${packagesPath}/${packageId}`,
        versions: [],
      };
      let intact = false;
      fs.readdirSync(`${packagesPath}/${packageId}`)
        .sort(compareNuGetVersions)
        .reverse()
        .forEach((packageVersion) => {
          const nuspecPath = `${packagesPath}/${packageId}/${packageVersion}/${packageId}.nuspec`;
          if (!fs.existsSync(nuspecPath)) return;
          const xml = fs.readFileSync(nuspecPath, "utf8");
          const parser = new XMLParser({
            ignoreDeclaration: true,
            ignoreAttributes: false,
            attributeNamePrefix: "__",
          });
          const nuspec = parser.parse(xml);
          const metadata = nuspec.package.metadata;
          pkg.versions.push(packageVersion);
          pkg.name = metadata.id || packageId;
          pkg.description = metadata.description;
          pkg.tags = metadata.tags;
          pkg.authors = metadata.authors;
          pkg.owners = metadata.owners;
          if (pkg.owners === pkg.authors) delete pkg.owners;
          pkg.projectUrl = metadata.projectUrl;
          pkg.licenseUrl = metadata.licenseUrl;
          if (metadata.id == "DiscUtils") console.log(metadata.dependencies);
          pkg.repositoryUrl = metadata.repository?.__url;
          const iconUrl = metadata.iconUrl ?? metadata.icon;
          let iconPath = `${packagesPath}/${packageId}/${packageVersion}/icon.png`;
          if (!pkg.icon) {
            if (fs.existsSync(iconPath)) pkg.icon = iconPath;
            else if (iconUrl && iconUrl.startsWith("http")) {
              pkg.icon = iconUrl;
            } else if (iconUrl) {
              iconPath = `${packagesPath}/${packageId}/${packageVersion}/${iconUrl}`;
              if (fs.existsSync(iconPath)) pkg.icon = iconPath;
            }
          }

          intact = true;
        });

      if (intact) packages.push(pkg);
    });
    return packages;
  },
};
