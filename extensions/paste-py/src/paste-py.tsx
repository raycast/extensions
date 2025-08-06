import { Form, ActionPanel, Action, showToast, Toast, open } from "@raycast/api";
import { useState, useEffect } from "react";

interface FormValues {
  content: string;
  extension: string;
}

interface Language {
  name: string;
  type: string;
  extensions: string[];
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [extensionOptions, setExtensionOptions] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [extension, setExtension] = useState("txt");

  useEffect(() => {
    async function fetchLanguages() {
      try {
        const response = await fetch("https://paste.fosscu.org/languages.json");
        const data = await response.json();

        if (Array.isArray(data)) {
          const allExtensions = new Set<string>();
          data.forEach((lang: Language) => {
            if (lang.extensions && Array.isArray(lang.extensions)) {
              lang.extensions.forEach((ext: string) => {
                allExtensions.add(ext.startsWith(".") ? ext.slice(1) : ext);
              });
            }
          });
          setExtensionOptions(Array.from(allExtensions).sort());
        } else {
          console.error("Languages API returned unexpected format:", data);
          // Fallback to common extensions
          setExtensionOptions(["txt", "js", "py", "html", "css", "json", "md", "cpp", "java", "go"].sort());
        }
      } catch (error) {
        console.error("Failed to fetch languages:", error);
        // Fallback to common extensions
        setExtensionOptions(["txt", "js", "py", "html", "css", "json", "md", "cpp", "java", "go"].sort());
      }
    }
    fetchLanguages();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!values.content.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter some content to upload",
      });
      return;
    }

    setIsLoading(true);

    try {
      const filename = `paste.${values.extension || "txt"}`;
      const file = new File([values.content], filename, { type: "text/plain" });

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://paste.fosscu.org/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resultText = await response.text();
      const pasteUrl = resultText.trim();

      if (pasteUrl && pasteUrl.startsWith("http")) {
        await open(pasteUrl);
        setContent("");
        setExtension("txt");
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Paste created and opened in browser",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Upload failed",
          message: "Invalid response from API",
        });
      }
    } catch (error) {
      showFailureToast(error, { title: "Upload failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Paste" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Paste your code or text here..."
        value={content}
        onChange={setContent}
      />
      <Form.Dropdown
        id="extension"
        title="Language/Extension"
        placeholder="Select language extension"
        value={extension}
        onChange={setExtension}
      >
        <Form.Dropdown.Item value="txt" title="Plain Text" />
        {extensionOptions.map((ext) => (
          <Form.Dropdown.Item key={ext} value={ext} title={ext} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
