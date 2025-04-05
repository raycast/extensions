import { ActionPanel, Action, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { useState, useEffect } from "react";

const execPromise = promisify(exec);

interface FormValues {
  hostname: string;
}

interface Mapping {
  name: string;
  destination: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMappings() {
      try {
        const { stdout, stderr } = await execPromise("lightproxy list");

        if (stderr && stderr.trim().length > 0) {
          throw new Error(stderr);
        }

        const parsedMappings = parseMappingsOutput(stdout);
        setMappings(parsedMappings);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch mappings",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchMappings();
  }, []);

  function parseMappingsOutput(output: string): Mapping[] {
    const mappings: Mapping[] = [];

    // Match pattern for entries like:
    // • PORT: example.test → 127.0.0.1:3000
    // Or simple lines like: example.test -> 127.0.0.1:3000
    const lines = output.split("\n");
    const mappingRegex = /(•\s+PORT:|•\s+FOLDER:|\s*)([\w.-]+)(?:\s+→\s+|\s+->\s+)(.+)/;

    for (const line of lines) {
      const match = line.match(mappingRegex);
      if (match) {
        mappings.push({
          name: match[2],
          destination: match[3],
        });
      }
    }

    return mappings;
  }

  async function handleSubmit(values: FormValues) {
    const { hostname } = values;

    if (!hostname) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Hostname is required",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Removing mapping...",
        message: hostname,
      });

      const { stderr } = await execPromise(`lightproxy remove ${hostname}`);

      if (stderr && stderr.trim().length > 0 && !stderr.includes("Configuration updated")) {
        throw new Error(stderr);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Mapping removed successfully",
        message: hostname,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove mapping",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const mappingDropdownItems = mappings.map((mapping, index) => (
    <Form.Dropdown.Item key={index} value={mapping.name} title={mapping.name} />
  ));

  return (
    <Form
      navigationTitle="Remove LightProxy Mapping"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Remove Mapping" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {mappings.length > 0 ? (
        <Form.Dropdown id="hostname" title="Select Hostname" info="Choose a hostname to remove">
          {mappingDropdownItems}
        </Form.Dropdown>
      ) : (
        <Form.TextField id="hostname" title="Hostname" placeholder="Enter hostname to remove (e.g., myapp.test)" />
      )}
      {error && <Form.Description text={`Error: ${error}`} />}
      {!error && mappings.length === 0 && !isLoading && (
        <Form.Description text="No mappings found. You can still manually enter a hostname to remove." />
      )}
    </Form>
  );
}
