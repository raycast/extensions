// Credits
// Based on the dl code of the speedtest extension
// https://github.com/raycast/extensions/blob/main/extensions/speedtest/src/lib/cli.ts

import { environment } from "@raycast/api";
import path from "path/posix";
import fs from "fs";
import afs from "fs/promises";
import { sha256FileHash } from "./utils";

const { DownloaderHelper } = require('node-downloader-helper');
const extract = require('extract-zip')

//https://github.com/sttz/expresso/releases/download/1.3.0/expresso-1.3.0-osx64.zip
const cliVersion = "1.3.0";
const cliFileInfo = {
  arch: "osx64",
  pkg: "expresso.zip",
  sha256: "683e9084f1448e03b959c7256933108c6f486e0e06e608ef3b678e651b8357b2",
};

export function getCliDirectory(): string {
  return path.join(environment.supportPath, "cli");
}

export function getCliPath(): string {
  return path.join(getCliDirectory(), "expresso");
}

export function hasCLI(): boolean {
  const cli = getCliPath();

  return fs.existsSync(cli);
}


export async function download(url: string,
                               dlPath: string,
                               fileName: string): Promise<string> {
  console.log("Downloading from " + url);

  // Create dl path
  try {
    await afs.mkdir(dlPath, { recursive: true });
  } catch (err: any) {
    throw(Error("Could not create download folder: " + err.message));
  }

  const dl = new DownloaderHelper(
    url,
    dlPath,
    {fileName: fileName}
  );

  // Required to ensure errors are thrown and caught
  dl.on('error', (err: any) => console.log('Download Failed', err));

  await dl.start().catch((err: any) => {
    throw(Error("Could not download expresso cli: " + err.message));
  } );

  console.log("Finished downloading expresso...");

  return path.join(dlPath, fileName);
}

export async function checkArchiveHash(archive_path: string) {
  console.log("Checking archive sha256 hash");

  const archiveHash = await sha256FileHash(archive_path);
  if (archiveHash !== cliFileInfo.sha256) {
    console.log("Throwing hash error");
    throw(Error("Hash of download is wrong"));
  }
}

export async function unzipArchive(archive_path: string, dst_path: string) {
  console.log("Unziping archive " + archive_path);

  try {
    await afs.mkdir(dst_path, { recursive: true });

    await extract(archive_path, { dir: dst_path });
    console.log("Done unzipping");

  } catch (error: any) {
    throw(new Error("ZIP Extraction Failed: " + error.message));
  }
}

export async function chmodCLI(cliPath: string) {
  console.log("Setting permissions for " + cliPath);

  try {
    await afs.chmod(cliPath, "755");
  } catch (error: any) {
    await afs.rm(cliPath);
    throw(Error("Could not chmod expresso cli: " + error.message));
  }
}

export async function downloadCLI() {
  const cli = getCliPath();
  if (fs.existsSync(cli)) {
    return cli;
  }

  const binaryURL = `https://github.com/sttz/expresso/releases/download/${cliVersion}/expresso-${cliVersion}-${cliFileInfo.arch}.zip`;
  const dlPath = path.join(environment.supportPath, ".tmp");
  const dstPath = getCliDirectory();
  const cliPath = getCliPath();

  try {

    const archive_path = await download(binaryURL, dlPath, cliFileInfo.pkg);
    await checkArchiveHash(archive_path);
    await unzipArchive(archive_path, dstPath);
    await chmodCLI(cliPath);

  } catch (error) {

    // On error delete the final dst path and binary
    try {
      await afs.rm(dstPath, { recursive: true });
    } catch { }

    // Throw original error
    throw(error);
  } finally {

    // Always delete dl files
    try {
      await afs.rm(dlPath, { recursive: true });
    } catch { }
  }

  console.log("Done with cli: " + cliPath);
  return cliPath;
}
