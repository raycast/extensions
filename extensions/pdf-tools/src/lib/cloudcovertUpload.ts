import CloudConvert from "cloudconvert";
import fs from "fs";
import https from "https";
import { createConversionTask } from "./task_convert";
import { createCompressTask } from "./task_compress";

export class TaskUpload {
  async convertFileTaskExecuter(
    APIKey: string,
    pathFileToUpload: string,
    task: string,
    extension: string,
    compressVal: string,
  ) {
    try {
      const cloudc = new CloudConvert(APIKey);
      let jobPromise;

      if (task === "convert") {
        jobPromise = createConversionTask(cloudc, extension);
      }
      if (task === "compress") {
        jobPromise = createCompressTask(cloudc, compressVal);
      }

      const job = await jobPromise;
      const uploadTask = (job?.tasks ?? []).filter((task: { name: string }) => task.name === "Upload")[0];
      const inputFile = fs.createReadStream(pathFileToUpload);
      const fileName = pathFileToUpload.split("/").pop();

      const result = await cloudc.tasks.upload(uploadTask, inputFile, fileName);
      console.log(result);

      const resJob = await cloudc.jobs.wait(job?.id ?? "");
      const file = cloudc.jobs.getExportUrls(resJob)[0];

      if (file && file.url) {
        const pathFileToStored: string = pathFileToUpload.split(".").slice(0, -1).join(".") + "(1)" + ".pdf";
        const writeStream = fs.createWriteStream(pathFileToStored);

        https.get(file.url, function (response) {
          response.pipe(writeStream);
        });

        await new Promise((resolve, reject) => {
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
      } else {
        console.error("Invalid file object. Missing URL property.");
        return false;
      }
    } catch (err) {
      console.error("Error during file processing:", err);
      return false;
    }
    return true;
  }
}
