import fs from "fs";
import path from "path";
import mime from "mime-types";
import { CloudProviderAccount } from "../cloudProviders";
import https from "https";

export async function uploadToBunny(
  provider: CloudProviderAccount,
  filePath: string,
  defaultPath: string,
): Promise<string> {
  const { storageZone, apiKey, storageEndpoint } = provider.credentials;
  if (!storageZone || !apiKey) throw new Error("Missing BunnyCDN credentials");
  const endpoint = storageEndpoint || "storage.bunnycdn.com";
  const fileName = path.basename(filePath);
  const key = defaultPath ? `${defaultPath.replace(/\/+$/, "")}/${fileName}` : fileName;
  const url = `https://${endpoint}/${storageZone}/${key}`;
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = mime.lookup(fileName) || "application/octet-stream";

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "PUT",
        headers: {
          AccessKey: apiKey,
          "Content-Type": contentType,
          "Content-Length": fileBuffer.length,
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          let errorMsg = `BunnyCDN upload failed: ${res.statusCode}`;
          res.on("data", (chunk) => {
            errorMsg += `\n${chunk.toString()}`;
          });
          res.on("end", () => {
            reject(new Error(errorMsg));
          });
        }
      },
    );
    req.on("error", (err) => {
      reject(err);
    });
    req.write(fileBuffer);
    req.end();
  });

  // Return the public URL
  return getPublicBunnyUrl(provider, filePath);
}

export function getPublicBunnyUrl(provider: CloudProviderAccount, filePath: string): string {
  const { storageZone, domain, pullZoneDomain } = provider.credentials;
  const fileName = path.basename(filePath);
  const key = provider.defaultPath ? `${provider.defaultPath.replace(/\/+$/, "")}/${fileName}` : fileName;
  if (provider.accessLevel === "public" && pullZoneDomain) {
    // Use pull zone name to construct the URL
    return `https://${pullZoneDomain}.b-cdn.net/${key}`;
  } else if (provider.accessLevel === "public" && domain) {
    const trimmedDomain = domain.replace(/\/+$/, "");
    const normalizedDomain = /^https?:\/\//.test(trimmedDomain) ? trimmedDomain : `https://${trimmedDomain}`;
    return `${normalizedDomain}/${key}`;
  } else {
    // BunnyCDN default public URL (user must configure pull zone for this to work)
    return `https://${storageZone}.b-cdn.net/${key}`;
  }
}
