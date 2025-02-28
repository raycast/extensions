import { Action, ActionPanel, Form, LaunchProps, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { checkFavicon } from "./favicon-generator";

interface CheckFaviconValues {
  port?: string;
  hostname: string;
}

// Validation functions
function validateHostname(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") {
    return "Hostname is required";
  }

  // Check if it's a valid URL with protocol
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      new URL(value);
      return undefined;
    } catch (e) {
      return "Please enter a valid URL";
    }
  }

  // Check if it's a valid hostname without protocol
  // Simple regex for hostname validation (allows domains, IPs, localhost)
  const hostnameRegex =
    /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;
  if (hostnameRegex.test(value) || value === "localhost") {
    return undefined;
  }

  return "Please enter a valid hostname or URL";
}

function validatePort(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined; // Empty port is valid (will use default)

  const portNumber = parseInt(value, 10);
  if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
    return "Please enter a valid port number (1-65535)";
  }

  return undefined;
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.CheckFavicon; launchContext: { htmlSnippets: string } }>,
) {
  const { port, hostname } = props.arguments;
  const { htmlSnippets } = props.launchContext ?? {};

  const { handleSubmit, itemProps } = useForm<CheckFaviconValues>({
    initialValues: {
      hostname: hostname || "localhost",
      port: port,
    },
    onSubmit: async (values) => {
      try {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Checking favicons..." });

        const result = await checkFavicon(values.port || undefined, values.hostname);

        toast.style = Toast.Style.Success;
        toast.title = "Success!";
        toast.message = "Favicon check completed. Check the logs for results.";

        // Log the detailed results
        console.log(result);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error checking favicons",
          message:
            error instanceof Error && error.message.includes("undici")
              ? "No web app found at that URL"
              : error instanceof Error
                ? error.message
                : "Unknown error occurred",
        });
      }
    },
    validation: {
      hostname: validateHostname,
      port: validatePort,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Check Favicon"
    >
      <Form.Description text="Check favicons on your website." />
      {htmlSnippets && (
        <Form.TextArea
          id="htmlSnippets"
          title="HTML Snippets"
          defaultValue={htmlSnippets}
          info="The HTML snippets to paste into your website!"
        />
      )}
      <Form.TextField
        {...itemProps.hostname}
        title="Hostname or URL"
        placeholder="Enter hostname or full URL (e.g., localhost or https://example.com)"
        info="The hostname or complete URL of your website (including http:// or https:// if needed)"
        storeValue={true}
      />
      <Form.TextField
        {...itemProps.port}
        title="Port (Optional)"
        placeholder="Enter port number (e.g., 3000)"
        info="The port where your website is running (leave empty for standard ports)"
        storeValue={true}
      />
    </Form>
  );
}
