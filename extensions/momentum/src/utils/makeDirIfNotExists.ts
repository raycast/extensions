import fs from "fs/promises";
import { Errors, ValidationError } from "./errors";

export const makeDirIfNotExists = async (path: string): Promise<void> => {
  await fs.mkdir(path).catch((err) => {
    if (err.code === Errors.EEXIST) {
      return;
    }

    if (err.code === Errors.EACCES) {
      throw new ValidationError(`couldn't create directory at ${path}, permission denied`);
    }

    console.error(err);
  });
};
