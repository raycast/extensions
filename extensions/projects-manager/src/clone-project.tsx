import {
  Form,
  ActionPanel,
  LocalStorage,
  getPreferenceValues,
  Action,
  showToast,
  open,
  BrowserExtension,
} from "@raycast/api";
import { Category } from "./types/category";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface Preferences {
  projectsFolder: string;
}

interface Project {
  name: string;
  categoryName: string;
  fullPath: string;
}

type Values = {
  name: string;
  category: string;
  githubURL?: string;
};

export default function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showGitHubInput, setShowGitHubInput] = useState(true);

  useEffect(() => {
    loadCategoriesAndProjects();
  }, []);

  useEffect(() => {
    async function checkGitHubURL() {
      const { isGitHub } = await getGitHubURL();
      setShowGitHubInput(!isGitHub);
    }
    checkGitHubURL();
  }, []);

  function handleOpenProject(project: Project) {
    const category = categories.find((c) => c.name === project.categoryName);
    if (!category) return;

    function findXcodeProject(dirPath: string): string | null {
      const files = fs.readdirSync(dirPath);

      // First check current directory for workspace files
      const workspaceFile = files.find((file) => file.endsWith(".xcworkspace"));
      if (workspaceFile) {
        return path.join(dirPath, workspaceFile);
      }

      // Then check for project files
      const projectFile = files.find((file) => file.endsWith(".xcodeproj"));
      if (projectFile) {
        return path.join(dirPath, projectFile);
      }

      // Recursively check subdirectories
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
          const found = findXcodeProject(fullPath);
          if (found) return found;
        }
      }

      return null;
    }
    if (category.name == "SwiftUI") {
      const xcodePath = findXcodeProject(project.fullPath);
      if (xcodePath) {
        console.log("xcodePath", xcodePath);
        open(xcodePath, category.defaultAppPath);
      }
    } else {
      open(project.fullPath, category.defaultAppPath);
    }
  }

  async function loadCategoriesAndProjects() {
    try {
      const storedCategories = await LocalStorage.getItem("categories");
      if (storedCategories) {
        const parsedCategories = JSON.parse(storedCategories as string);
        setCategories(parsedCategories);
      }
    } catch (error) {
      console.error("Failed to load categories and projects:", error);
    }
  }

  async function getGitHubURL() {
    const tabs = await BrowserExtension.getTabs();
    return {
      isGitHub: tabs.some((tab) => tab.url.includes("github.com") && tab.active),
      url: tabs.find((tab) => tab.url.includes("github.com"))?.url,
    };
  }

  async function handleSubmit(values: Values) {
    const { isGitHub, url } = await getGitHubURL();

    let name = "";
    let githubURL = "";
    if (isGitHub) {
      name = url?.split("/").pop() ?? "";
      githubURL = url ?? "";
    } else {
      name = values.githubURL?.split("/").pop() ?? "";
      githubURL = values.githubURL ?? "";
    }

    const category = values.category;
    const preferences = getPreferenceValues<Preferences>();
    const categoryPath = path.join(preferences.projectsFolder, category);
    const projectPath = path.join(categoryPath, name);

    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }

    if (!fs.existsSync(projectPath)) {
      execSync(`git clone ${githubURL} ${projectPath}`);
    }

    // fs.mkdirSync(projectPath, { recursive: true });

    const project: Project = {
      name: name,
      categoryName: category,
      fullPath: projectPath,
    };

    handleOpenProject(project);

    // const categoryDetails = categories.find(c => c.name === category);

    showToast({ title: "Submitted form", message: "See logs for submitted values" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {showGitHubInput && <Form.TextField id="githubURL" title="Enter GitHub URL" placeholder="" defaultValue="" />}

      <Form.Dropdown id="category" value={selectedCategory ?? ""} onChange={setSelectedCategory}>
        {categories.map((category) => (
          <Form.Dropdown.Item
            key={category.name}
            title={category.name}
            value={category.name}
            icon={category.imagePath}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
