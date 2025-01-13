// src/components/ValidatorList.tsx

import { Action, ActionPanel, Clipboard, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { GitHubFile, ValidatorFunction } from "../types/index";
import { fetchWithRateLimit, GITHUB_API_BASE, verifyGitHubToken } from "../utils/github";
import { validatorLookup } from "../utils/validatorLookup";
import { ValidatorImplementation } from "./ValidatorImplementation";

// Constants for external resources and file extensions
const REPO_URL = "https://github.com/validatorjs/validator.js";
const NPM_INSTALL_COMMAND = "npm install validator";
const JS_EXTENSION = ".js";
const TEST_FILE_INDICATOR = ".test.";
const INDEX_FILE_NAME = "index.js";
const NO_DESCRIPTION = "No description available";
const UNCATEGORIZED = "Uncategorized";

interface Props {
  headers: Record<string, string>;
}

/**
 * ValidatorList component
 *
 * Displays a list of validator functions from the validator.js library.
 * Allows users to search, filter by category, and perform actions on each function.
 *
 * @param {Props} props - Component props containing HTTP headers for API requests.
 * @returns {JSX.Element} The rendered component.
 */
export function ValidatorList({ headers }: Props): JSX.Element {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [functions, setFunctions] = useState<ValidatorFunction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<string[]>([]);

  /**
   * Displays an error toast notification.
   *
   * @param {string} title - The title of the toast.
   * @param {string} message - The message of the toast.
   */
  const showErrorToast = async (title: string, message: string) => {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  };

  /**
   * Displays a success toast notification.
   *
   * @param {string} title - The title of the toast.
   * @param {string} [message] - The optional message of the toast.
   */
  const showSuccessToast = async (title: string, message?: string) => {
    await showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  };

  // Fetch validator functions when the component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Verify GitHub token
        const isTokenValid = await verifyGitHubToken(headers);
        if (!isTokenValid) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid GitHub Token",
            message: "Please check your GitHub token in preferences",
            primaryAction: {
              title: "Open Preferences",
              onAction: () => openExtensionPreferences(),
              shortcut: { modifiers: ["cmd"], key: "," },
            },
          });
          setIsLoading(false);
          return;
        }

        // Fetch validator functions
        const apiUrl = `${GITHUB_API_BASE}/src/lib`;
        const { data: files } = await fetchWithRateLimit<GitHubFile[]>(apiUrl, { headers });

        const validatorFiles = files.filter(isValidValidatorFile);

        const functionsData = validatorFiles.map(mapFileToFunctionData);

        setCategories(getUniqueCategories(functionsData));
        setFunctions(functionsData);
      } catch (error) {
        console.error("Fetch error in fetchAndSetValidatorFunctions:", error);
        await showErrorToast(
          "Failed to fetch validator functions",
          error instanceof Error ? error.message : "Unknown error",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  /**
   * Determines if a file is a valid validator file.
   *
   * @param {GitHubFile} file - The file to check.
   * @returns {boolean} True if the file is a valid validator file, false otherwise.
   */
  const isValidValidatorFile = (file: GitHubFile): boolean =>
    file.name.endsWith(JS_EXTENSION) && !file.name.includes(TEST_FILE_INDICATOR) && file.name !== INDEX_FILE_NAME;

  /**
   * Maps a GitHub file to a ValidatorFunction object.
   *
   * @param {GitHubFile} file - The file to map.
   * @returns {ValidatorFunction} The mapped ValidatorFunction object.
   */
  const mapFileToFunctionData = (file: GitHubFile): ValidatorFunction => {
    const name = file.name.replace(JS_EXTENSION, "");
    const validatorInfo = validatorLookup[name];

    return {
      name,
      path: `lib/${file.name}`,
      description: validatorInfo?.description || NO_DESCRIPTION,
      signature: `${name}()`,
      category: validatorInfo?.category || UNCATEGORIZED,
    };
  };

  /**
   * Extracts unique categories from a list of ValidatorFunction objects.
   *
   * @param {ValidatorFunction[]} functionsData - The list of ValidatorFunction objects.
   * @returns {string[]} A sorted array of unique categories.
   */
  const getUniqueCategories = (functionsData: ValidatorFunction[]): string[] =>
    [...new Set(functionsData.map((func) => func.category))].sort();

  // Filters the functions based on search text and selected category
  const filteredFunctions = functions.filter((func) => {
    const matchesCategory = selectedCategory === "" || func.category === selectedCategory;
    const matchesSearchText =
      func.name.toLowerCase().includes(searchText.toLowerCase()) ||
      func.description.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearchText;
  });

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      searchBarPlaceholder="Search validator functions..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Category" value={selectedCategory} onChange={setSelectedCategory}>
          <List.Dropdown.Item title="All Categories" value="" />
          {categories.map((category) => (
            <List.Dropdown.Item key={category} title={category} value={category} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No matching validator functions found"
        description="Try a different search term"
      />
      {filteredFunctions.map((func) => (
        <List.Item
          key={func.name}
          title={func.name}
          subtitle={func.description}
          icon={validatorLookup[func.name]?.icon || Icon.QuestionMark}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="View Implementation"
                  icon={Icon.Code}
                  target={<ValidatorImplementation validator={func} headers={headers} />}
                />
                <Action.CopyToClipboard
                  title="Copy Function Name"
                  content={func.name}
                  onCopy={() => showSuccessToast(`Copied ${func.name}!`)}
                />
                <Action.CopyToClipboard
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Copy ES Module Import"
                  content={`import { ${func.name} } from 'validator';`}
                  onCopy={() =>
                    showSuccessToast("Copied ES Module import", `import { ${func.name} } from 'validator';`)
                  }
                />
                <Action.CopyToClipboard
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Copy CommonJS Import"
                  content={`const { ${func.name} } = require('validator');`}
                  onCopy={() =>
                    showSuccessToast("Copied CommonJS import", `const { ${func.name} } = require('validator');`)
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Visit Official Repository" url={REPO_URL} icon={Icon.Globe} />
                <Action
                  title="Copy npm Install Command"
                  icon={Icon.CopyClipboard}
                  onAction={() => {
                    Clipboard.copy(NPM_INSTALL_COMMAND);
                    showSuccessToast("Copied to clipboard", NPM_INSTALL_COMMAND);
                  }}
                />
                <Action title="Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
