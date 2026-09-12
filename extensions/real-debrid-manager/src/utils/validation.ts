import fs from "fs";

import { LinkType } from "../schema";

type ValidationResult = {
  valid: boolean;
  type: null | LinkType;
};

export const validateLinkInput = (link?: string): ValidationResult => {
  const validationResult: ValidationResult = {
    valid: false,
    type: null,
  };

  if (link) {
    const urlPattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/;
    const magnetPattern = /^magnet:\?xt=urn:btih:[a-z0-9]{20,}.*$/i;

    if (urlPattern.test(link)) {
      validationResult.valid = true;
      validationResult.type = "link";
    } else if (magnetPattern.test(link)) {
      validationResult.valid = true;
      validationResult.type = "magnet";
    }
  }

  return validationResult;
};

export const validateTorrentFile = (filePath: string) => {
  // Check if file exists on disk
  if (!fs.existsSync(filePath)) {
    throw new Error("File does not exist.");
  }

  const stats = fs.lstatSync(filePath);

  // Check if filePath is a file
  if (!stats.isFile()) {
    throw new Error("The path is not a file.");
  }

  // Check if file size is less than 1MB
  const fileSizeInBytes = stats.size;
  const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
  if (fileSizeInMegabytes > 1) {
    throw new Error("File size should not be more than 1MB.");
  }

  // Check if the file is a .torrent file
  if (!filePath.endsWith(".torrent")) {
    throw new Error("Not a .torrent file.");
  }
};
