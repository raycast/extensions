import path from "path";
import { readFile } from "fs/promises";
import { useState, useEffect } from "react";
import { Detail, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default function ReadmeView() {
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReadme();
  }, []);

  async function loadReadme() {
    try {
      setIsLoading(true);
      const readmePath = path.resolve(environment.assetsPath, "README.md");
      const content = await readFile(readmePath, "utf8");
      setReadmeContent(content);
    } catch (error) {
      console.error("Failed to load README:", error);
      await showFailureToast(error, { title: "Failed to Load", message: "Could not load README file" });
      setReadmeContent("# Load Failed\n\nUnable to load README.md file. Please check if the file exists.");
    } finally {
      setIsLoading(false);
    }
  }

  return <Detail isLoading={isLoading} markdown={readmeContent} navigationTitle="README" />;
}
