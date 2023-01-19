import { showToast, Toast } from "@raycast/api";
import fs from "fs";

const useImport = () => {
  const handleValidationError = async () => {
    await showToast({
      title: "There was an error",
      message: "Please only select .txt files",
      style: Toast.Style.Failure,
    });
  };

  const isTxtFile = (file: string) => {
    return fs.lstatSync(file).isFile() && file.endsWith(".txt");
  };

  const isFolder = (file: string) => {
    return fs.lstatSync(file).isDirectory();
  };

  const readFile = async (file: string) => {
    if (!isTxtFile(file)) {
      handleValidationError();
      return false;
    }

    try {
      const data = fs.readFileSync(file, "utf8");
      return data;
    } catch (error) {
      showToast({
        title: "There was an error",
        message: `Failed to import ${file}`,
        style: Toast.Style.Failure,
      });
    }
  };

  const readFolder = async (folder: string) => {
    if (!isFolder(folder)) {
      handleValidationError();
      return false;
    }

    try {
      const files = fs.readdirSync(folder);
      const filesWithFolder = files.map((file) => `${folder}/${file}`);

      return filesWithFolder;
    } catch (error) {
      showToast({
        title: "There was an error",
        message: `Failed to import ${folder}`,
        style: Toast.Style.Failure,
      });
    }
  };

  return { readFile, readFolder, isFolder, isTxtFile };
};

export default useImport;
