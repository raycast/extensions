/*
 * @author: tisfeng
 * @createTime: 2023-05-15 23:31
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-05-17 18:40
 * @fileName: recognizeText.ts
 *
 * Copyright (c) 2023 by ${git_name}, All Rights Reserved.
 */

import { environment } from "@raycast/api";
import { execa, ExecaError } from "execa";
import { join } from "path";

const recognizeText = async () => {
  try {
    const filePath = join(environment.assetsPath, "recognizeText.swift");
    const { stdout } = await execa("swift", [filePath]);
    return stdout;
  } catch (error) {
    if ((error as ExecaError).stdout === "No text selected") {
      return undefined;
    } else {
      throw error;
    }
  }
};

export { recognizeText };
