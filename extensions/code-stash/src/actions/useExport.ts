import { useCallback } from "react";
import { showHUD, showToast, Toast } from "@raycast/api";
import { CodeStash } from "../types";

import fs from "fs";
import archiver from "archiver";

const useExport = () => {
  const generateZipName = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const date = `${dd}-${mm}-${yyyy}`;
    return `code-stash-${date}`;
  };

  const handleExport = useCallback(async (codeStashes: CodeStash[]) => {
    const zipName = generateZipName();
    const path = `${process.env.HOME}/Downloads/${zipName}.zip`;

    const output = fs.createWriteStream(path);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    archive.on("error", async (err: string) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "There was an error",
        message: err,
      });
    });

    archive.pipe(output);

    codeStashes.forEach(({ code, title }) => {
      archive.append(code, { name: `${title}.txt` });
    });

    archive.finalize();

    output.on("close", async () => {
      await showHUD(`Exported successfully to Downloads folder`);
    });
  }, []);

  return { handleExport };
};

export default useExport;
