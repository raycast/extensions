import { Action, environment, showToast, Toast, useNavigation } from "@raycast/api";
import path from "path";
import config = require("../config.json");
import fs from "fs";
import DescriptionSubmit from "../components/descriptionSubmit";

export function ResumeUploadAction() {
  const { push } = useNavigation();
  const resumePath = path.join(environment.supportPath, config.resumePath);
  const metadataPath = path.join(environment.supportPath, config.metadataPath);

  async function handleSubmit(input: { files: string[]; description: string }) {
    const file = input.files[0];
    try {
      if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || !file.endsWith(".pdf")) {
        showToast({ title: "Invalid file", message: "Please select a PDF file", style: Toast.Style.Failure });
        return false;
      }
      fs.copyFile(file, resumePath, (err) => {
        if (err) {
          console.error(err);
          showToast({ title: "Error", message: "Failed to store the file", style: Toast.Style.Failure });
          return;
        }
        showToast({ title: "Success", message: "File stored successfully", style: Toast.Style.Success });
      });
      const metadata = {
        originalName: path.basename(file),
        storedName: path.basename(resumePath),
        uploadDate: new Date()
          .toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(",", ""),
        description: input.description,
      };
      fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), (err) => {
        if (err) {
          console.error(err);
          showToast({ title: "Error", message: "Failed to store metadata", style: Toast.Style.Failure });
        }
      });
      push(<DescriptionSubmit />);
    } catch (error) {
      console.error(error);
      showToast({ title: "Error", message: "Failed to store the file", style: Toast.Style.Failure });
    }
  }

  return <Action.SubmitForm title="Submit Resume" onSubmit={handleSubmit} />;
}
