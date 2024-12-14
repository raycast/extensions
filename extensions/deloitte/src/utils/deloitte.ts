import { exec } from "child_process";

export const scriptArchiveFiles = async (filePaths: string[]) => {
  try {
    const _filePaths = filePaths.map((value) => `"${value}"`).join(" ");
    const command = `~/Alex/bin/zip-deloitte.sh ${_filePaths}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(`Stdout: ${stdout}`);
    });
  } catch (e) {
    console.error(String(e));
  }
};

export const scriptExtractArchives = async (filePaths: string[]) => {
  try {
    const _filePaths = filePaths.map((value) => `"${value}"`).join(" ");
    const command = `~/Alex/bin/unzip-deloitte.sh ${_filePaths}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(`Stdout: ${stdout}`);
    });
  } catch (e) {
    console.error(String(e));
  }
};