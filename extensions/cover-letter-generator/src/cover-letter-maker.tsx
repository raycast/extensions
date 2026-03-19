import { environment } from "@raycast/api";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import config = require("./config.json");
import ResumeUpload from "./components/resumeUpload";

import DescriptionSubmit from "./components/descriptionSubmit";

export default function Command() {
  const assetPath = path.join(environment.supportPath, config.assetPath);
  const coverLetterPath = path.join(environment.supportPath, config.coverLetterPath);
  if (!existsSync(assetPath)) {
    mkdirSync(assetPath, { recursive: true });
  }
  if (!existsSync(coverLetterPath)) {
    mkdirSync(coverLetterPath, { recursive: true });
  }

  const resumePath = path.join(assetPath, "resume.pdf");
  if (!existsSync(resumePath)) {
    console.log(environment.supportPath);
    return <ResumeUpload />;
  }
  return <DescriptionSubmit />;
}
