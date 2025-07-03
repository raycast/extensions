import React, { useState, useEffect } from "react";
import { Detail, showToast, Toast, environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";

export default function ReadmeView() {
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReadme();
  }, []);

  async function loadReadme() {
    try {
      setIsLoading(true);
      const readmePath = join(environment.assetsPath, "README.md");
      const content = readFileSync(readmePath, "utf8");
      setReadmeContent(content);
    } catch (error) {
      console.error("Failed to load README:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Load Failed",
        message: "Unable to load README.md file",
      });
      setReadmeContent("# Load Failed\n\nUnable to load README.md file. Please check if the file exists.");
    } finally {
      setIsLoading(false);
    }
  }

  return <Detail isLoading={isLoading} markdown={readmeContent} navigationTitle="README" />;
}
