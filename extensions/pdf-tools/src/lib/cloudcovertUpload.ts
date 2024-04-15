import CloudConvert from "cloudconvert";
import fs from "fs";
import https from "https";
import { createConversionTask } from "./task_convert";
import { createCompressTask } from "./task_compress";

export class TaskUpload {
  async convertFileTaskExecuter(
    APIKey: string,
    pathFileToConvert: string,
    task: string,
    extension: string,
    compressVal: string,
  ) {
    const cloudc = new CloudConvert(APIKey);

    let jobPromise;

    if (task === "convert") {
      jobPromise = createConversionTask(cloudc, extension);
    }
    if (task === "compress") {
      jobPromise = createCompressTask(cloudc, compressVal);
    }

    try {
      let job = await jobPromise; // Wait for the Promise to resolve and get the job object

      // Now you can access the tasks property on job
      const uploadTask = (job?.tasks ?? []).filter((task: { name: string }) => task.name === "Upload")[0];

      const inputFile = fs.createReadStream(pathFileToConvert);

      const fileName = pathFileToConvert.split("/").pop();

      try {
        const result = await cloudc.tasks.upload(uploadTask, inputFile, fileName);
        console.log(result);

        const resJob = await cloudc.jobs.wait(job?.id ?? ""); // Wait for job completion

        const file = cloudc.jobs.getExportUrls(resJob)[0];

        if (file && file.url) {
          try {
            const pathFileToStored: string = pathFileToConvert.split(".").slice(0, -1).join(".") + "(1)" + ".pdf";

            const writeStream = fs.createWriteStream(pathFileToStored);

            https.get(file.url, function (response) {
              response.pipe(writeStream);
            });

            await new Promise((resolve, reject) => {
              writeStream.on("finish", resolve);
              writeStream.on("error", reject);
            });
          } catch (err) {
            console.error("Error downloading file:", err);
            return err;
          }
        } else {
          console.error("Invalid file object. Missing URL property.");
          return;
        }
      } catch (err) {
        console.error("Error uploading file:", err);
        return err;
      }
    } catch (err) {
      console.error("Error creating job:", err);
      return err;
    }
    return true;
  }
}
