import * as fs from "fs/promises";
import * as plist from "plist";
import * as forge from "node-forge";
import { DeveloperCertificate, Entitlements, ProfileType, ProvisioningProfile } from "../types";

function getProfileType(profile: {
  Entitlements: Entitlements;
  ProvisionsAllDevices?: boolean;
  ProvisionedDevices?: string[];
  Platform: string[];
}): ProfileType {
  const hasDevices = !!(profile.ProvisionedDevices && profile.ProvisionedDevices.length > 0);
  const isEnterprise = profile.ProvisionsAllDevices === true;
  const getTaskAllow = "get-task-allow" in profile.Entitlements && profile.Entitlements["get-task-allow"] === true;

  // Based on ProvisionQL
  // https://github.com/ealeksandrov/ProvisionQL/blob/9ff31049592b27743e9205bf75751d319afc3e53/ProvisionQL/GeneratePreviewForURL.m
  const platform = profile.Platform?.[0];

  if (platform === "macOS") {
    if (hasDevices) {
      return "Development";
    } else {
      return "App Store";
    }
  } else {
    // iOS, watchOS, tvOS, etc.
    if (hasDevices) {
      if (getTaskAllow) {
        return "Development";
      } else {
        return "Ad Hoc";
      }
    } else {
      if (isEnterprise) {
        return "Enterprise";
      } else {
        return "App Store";
      }
    }
  }
}

function parseCertificate(certBuffer: Buffer): DeveloperCertificate {
  const cert = forge.pki.certificateFromAsn1(forge.asn1.fromDer(certBuffer.toString("binary")));

  const subject: Record<string, string> = cert.subject.attributes.reduce(
    (acc, attr) => {
      if (attr.shortName && typeof attr.value === "string") {
        acc[attr.shortName] = attr.value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const issuer: Record<string, string> = cert.issuer.attributes.reduce(
    (acc, attr) => {
      if (attr.shortName && typeof attr.value === "string") {
        acc[attr.shortName] = attr.value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  return {
    encoded: certBuffer,
    serialNumber: cert.serialNumber,
    subject: {
      commonName: subject.CN ?? "",
      organizationName: subject.O ?? "",
      organizationalUnitName: subject.OU ?? "",
    },
    issuer: {
      commonName: issuer.CN ?? "",
    },
    validity: {
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
    },
  };
}

export async function parseProvisioningProfile(filePath: string): Promise<ProvisioningProfile> {
  const fileContent = await fs.readFile(filePath);
  const fileContentString = fileContent.toString("utf8");

  const plistStartIndex = fileContentString.indexOf("<?xml");
  const plistEndIndex = fileContentString.indexOf("</plist>") + "</plist>".length;

  if (plistStartIndex === -1 || plistEndIndex === -1) {
    throw new Error(`Could not find plist in file: ${filePath}`);
  }

  const plistString = fileContentString.substring(plistStartIndex, plistEndIndex);
  const parsedPlist = plist.parse(plistString) as Omit<
    ProvisioningProfile,
    "Type" | "DeveloperCertificates" | "filePath"
  > & { DeveloperCertificates: Buffer[] };

  return {
    ...parsedPlist,
    DeveloperCertificates: parsedPlist.DeveloperCertificates.map(parseCertificate),
    Type: getProfileType(parsedPlist),
    filePath: filePath,
  };
}
