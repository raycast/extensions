import { Form, ActionPanel, Action, Icon, showToast, Toast, open, closeMainWindow } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { lookup } from "mime-types";
import CloudConvert from "cloudconvert";
import fs from "fs";
import https from "https";

interface Preferences {
  APIKey: string;
  OpenNow: boolean;
  RemoveOriginal: boolean;
}

const { APIKey, OpenNow, RemoveOriginal } = getPreferenceValues<Preferences>();

export default function Command() {
  const [file, setFile] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const uploadFile = async (file: Array<string>) => {
    setIsLoading(true);
    if (!file.length) {
      await showToast(Toast.Style.Failure, "No file selected", "Please select an file to upload");
      setIsLoading(false);
      return;
    }

    if (file.length > 1) {
      await showToast(Toast.Style.Failure, "Multiple files selected", "Please select only one file");
      setIsLoading(false);
      return;
    }

    // file path
    const path: string = file[0];

    // get file name
    const fileName: string | undefined = path.split("/").pop();

    // check if file name is valid
    if (!fileName) {
      await showToast(Toast.Style.Failure, "Invalid File", "Please select a valid file");
      setIsLoading(false);
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
        "Please select an word or powerpoint file (.doc, .docx, .ppt, .pptx)"
      );
      setIsLoading(false);
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
    let job: any;
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
      toast.message = "Fail to create job";
      console.log(error);
      setIsLoading(false);
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
      toast.message = "Fail to upload file";
      setIsLoading(false);
      return;
    }

    const storedFileName: string = path.split(".").slice(0, -1).join(".") + ".pdf";
    toast.message = "Converting File...";
    try {
      job = await cloudConvert.jobs.wait(job.id); // Wait for job completion
      toast.message = "Downloading File...";
      const file: any = cloudConvert.jobs.getExportUrls(job)[0];
      const writeStream = fs.createWriteStream(storedFileName);
      https.get(file.url, function (response) {
        response.pipe(writeStream);
      });

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = "Fail to convert file";
      setIsLoading(false);
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
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);

    toast.style = Toast.Style.Success;
    toast.title = "Success";
    toast.message = "File converted successfully";

    if (OpenNow) {
      await closeMainWindow();
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

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={({ file }) => uploadFile(file)} icon={Icon.Upload} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.FilePicker
        id="file"
        value={file}
        onChange={setFile}
        title="File"
        autoFocus
        info="Select a word or ppt file to upload"
        allowMultipleSelection={false}
      />
    </Form>
  );
}
