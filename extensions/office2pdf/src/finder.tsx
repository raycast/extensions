import { getSelectedFinderItems, showToast, Toast, open } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { lookup } from "mime-types";
import CloudConvert from "cloudconvert";
import fs from "fs";
import https from "https";

interface Preferences {
  APIKey: string;
  OpenNow: boolean;
  RemoveOriginal: boolean;
}

interface FileResult {
  dir?: string;
  filename: string;
  url?: string;
  size?: number;
}

const { APIKey, OpenNow, RemoveOriginal } = getPreferenceValues<Preferences>();

export default async function Command() {
  let selectedItems = [];
  let successFileCount = 0;

  const uploadFile = async (file: string) => {
    // file path
    const path: string = file;

    // get file name
    const fileName: string | undefined = path.split("/").pop();

    // check if file name is valid
    if (!fileName) {
      await showToast(Toast.Style.Failure, `Invalid File: ${fileName}`, "Please select a valid file");
      return;
    }

    // determine the mime type
    const mimeType: string = lookup(path).toString().split("/")[1];

    // check if the mime type is not image or video
    if (
      mimeType !== "msword" &&
      mimeType !== "vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      mimeType !== "vnd.ms-powerpoint" &&
      mimeType !== "vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      await showToast(
        Toast.Style.Failure,
        "Invalid File Type",
        "Please select an word or powerpoint file (.doc, .docx, .ppt, .pptx)",
      );
      return;
    }

    // verify file type
    let fileType: string;
    switch (mimeType) {
      case "msword":
        fileType = "doc";
        break;
      case "vnd.openxmlformats-officedocument.wordprocessingml.document":
        fileType = "docx";
        break;
      case "vnd.ms-powerpoint":
        fileType = "ppt";
        break;
      case "vnd.openxmlformats-officedocument.presentationml.presentation":
        fileType = "pptx";
        break;
      default:
        fileType = "doc";
        break;
    }

    await convertFile(path, fileName, fileType);

    return;
  };

  const convertFile = async (path: string, fileName: string, fileType: string) => {
    const cloudConvert = new CloudConvert(APIKey);

    const toast = await showToast(Toast.Style.Animated, "Processing", "Creating Job...");

    // create job
    let job;
    try {
      job = await cloudConvert.jobs.create({
        tasks: {
          Upload: {
            operation: "import/upload",
          },
          Convert: {
            operation: "convert",
            input_format: fileType,
            output_format: "pdf",
            engine: "office",
            input: ["Upload"],
            optimize_print: true,
            pdf_a: false,
            include_markup: false,
            hidden_slides: false,
            output_type: "slides",
            engine_version: "2021",
          },
          Export: {
            operation: "export/url",
            input: ["Convert"],
            inline: false,
            archive_multiple_files: false,
          },
        },
        tag: "jobbuilder",
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = `Fail to create job: ${fileName}`;
      return;
    }

    // upload file
    toast.message = "Uploading File...";
    try {
      const uploadTask = job.tasks.filter((task: { name: string }) => task.name === "Upload")[0];
      const inputFile = fs.createReadStream(path);
      await cloudConvert.tasks.upload(uploadTask, inputFile, fileName);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = `Fail to upload file: ${fileName}`;
      return;
    }

    const storedFileName: string = path.split(".").slice(0, -1).join(".") + ".pdf";
    toast.message = `Converting File: ${fileName}`;
    try {
      job = await cloudConvert.jobs.wait(job.id); // Wait for job completion
      toast.message = `Downloading File: ${fileName}`;
      const file: FileResult = cloudConvert.jobs.getExportUrls(job)[0];
      const writeStream = fs.createWriteStream(storedFileName);
      https.get(file.url as string, function (response) {
        response.pipe(writeStream);
      });

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = `Fail to convert file: ${fileName}`;
      return;
    }

    // remove original file
    if (RemoveOriginal) {
      toast.message = "Removing Original File...";
      try {
        fs.unlinkSync(path);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = "Fail to remove original file";
        return;
      }
    }

    successFileCount++;
    if (successFileCount === selectedItems.length) {
      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = `All files converted successfully`;
    } else {
      toast.message = ` [${successFileCount}/${selectedItems.length}] ${fileName} converted successfully`;
    }

    if (OpenNow) {
      open(storedFileName);
    } else {
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => {
          open(storedFileName);
        },
      };
    }
  };

  try {
    selectedItems = await getSelectedFinderItems();
    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Please select one or more files to copy their path",
      });
      return;
    }
    await Promise.all(selectedItems.map((file) => uploadFile(file.path)));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot copy file path",
      message: String(error),
    });
  }
  // const files = selectedItems.filter((file: string) => fs.existsSync(file) && fs.lstatSync(file).isFile());
  // await Promise.all(files.map((file) => uploadFile(file)));
}
