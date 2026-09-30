import { Form, ActionPanel, Action, showToast, getPreferenceValues, Toast, open, popToRoot, Icon } from "@raycast/api";
import fs from "fs";
import https from "https";
import CloudConvert from "cloudconvert";

// get preferences
const apiKey = getPreferenceValues<Preferences>().api_key;
const cloudConvert = new CloudConvert(apiKey);

export default function Command() {
  async function compressPdf(file: string) {
    try {
      // set loading state
      await showToast(Toast.Style.Animated, "Compressing PDF...");

      // create task
      let job = await cloudConvert.jobs.create({
        tasks: {
          "import-file": {
            operation: "import/upload",
          },
          "compress-file": {
            operation: "optimize",
            input: ["import-file"],
            input_format: "pdf",
            engine: "3heights",
            profile: "web",
            flatten_signatures: false,
            engine_version: "6.27",
          },
          "export-file": {
            operation: "export/url",
            input: ["compress-file"],
            inline: false,
            archive_multiple_files: false,
          },
        },
        tag: "compress-pdf",
      });

      // get folder path from file
      const folderPath = file.substring(0, file.lastIndexOf("/"));

      // upload file
      const uploadTask = job.tasks.filter((task) => task.name === "import-file")[0];
      const inputFile = fs.createReadStream(file);
      const fileName = file.replace(/^.*[\\/]/, "");
      await cloudConvert.tasks.upload(uploadTask, inputFile, fileName);

      // get file
      job = await cloudConvert.jobs.wait(job.id);
      const convertedFile = cloudConvert.jobs.getExportUrls(job)[0];
      if (!convertedFile.url) {
        await showToast(Toast.Style.Failure, "Error", "No file found");
        return false;
      }

      // add -compressed to filename
      const newFileName = fileName.replace(".pdf", "-compressed.pdf");

      // download file
      const writeStream = fs.createWriteStream(folderPath + "/" + newFileName);
      https.get(convertedFile.url, function (response) {
        response.pipe(writeStream);
      });
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      // show success toast
      await showToast(Toast.Style.Success, "PDF Compressed", "Your PDF has been compressed");
      // open folder
      open(folderPath);
      // pop to root
      popToRoot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // show error toast
      await showToast(Toast.Style.Failure, "Error", error.message);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Minimize}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Compress PDF"
            onSubmit={(values) => {
              const file = values.file[0];
              if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
                return false;
              }
              // compress pdf
              compressPdf(file);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" allowMultipleSelection={false} />
      <Form.Description
        title="Info"
        text="When finished, your file will be placed under the same path. You have 25 free conversion minutes daily."
      />
    </Form>
  );
}
