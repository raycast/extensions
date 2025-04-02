import { Detail, List, Color, Icon, LaunchProps, ActionPanel, Action } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { API_BASE_URL, API_KEY } from "./utils/constants";

export default function Command(props: LaunchProps<{ arguments: Arguments.GetResources }>) {
  const userId = props.arguments.authorId;

  const { data, isLoading, error } = useFetch<ResourceSearchResult[]>(`${API_BASE_URL}/resources/authors/${userId}`, {
    headers: { Authorization: `Private ${API_KEY}`, "Content-Type": "application/json" },
    parseResponse: parseFetchResponse,
  });

  // Error handling
  if (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error(errorMessage);
    return showFailureToast(error, { title: "Failed to fetch resources", message: errorMessage });
  }

  // Loading state
  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading..." />;
  }

  // No data handling
  if (!data || data.length === 0) {
    return <Detail markdown="# No resources found" />;
  }

  // Render resources
  return (
    <List>
      {data.map((resource) => (
        <List.Item
          key={resource.resource_id}
          title={resource.title}
          subtitle={resource.tag_line.length > 50 ? `${resource.tag_line.substring(0, 50)}...` : resource.tag_line}
          accessories={[
            {
              tooltip: resource.price === 0 ? "Free" : `${Number(resource.price).toFixed(2)}`,
            },
            {
              text: {
                value: resource.price === 0 ? "Free" : `${Number(resource.price).toFixed(2)}`,
                color: Color.Green,
              },
              icon: Icon.CreditCard,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Resource"
                url={`https://www.builtbybit.com/resources/${resource.resource_id}/`}
              />
              <Action.CopyToClipboard
                title="Copy Link"
                content={`https://www.builtbybit.com/resources/${resource.resource_id}/`}
              />
              <Action.OpenInBrowser
                title="Edit"
                url={`https://www.builtbybit.com/resources/${resource.resource_id}/edit`}
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function parseFetchResponse(response: Response) {
  try {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }

    const json = (await response.json()) as
      | {
          result: string;
          data: {
            resource_id: string;
            author_id: string;
            title: string;
            tag_line: string;
            price: number;
            currency: string;
          }[];
        }
      | { error: { code: string; message: string } };

    if ("error" in json) {
      throw new Error(json.error.message);
    }

    // Ensure we're handling an array of resources
    const resources = Array.isArray(json.data) ? json.data : [json.data];

    return resources.map((resource) => ({
      resource_id: resource.resource_id,
      author_id: resource.author_id,
      title: resource.title,
      tag_line: resource.tag_line,
      price: resource.price,
      currency: resource.currency,
    })) as ResourceSearchResult[];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to parse response: ${String(error)}`);
  }
}

interface ResourceSearchResult {
  resource_id: string;
  author_id: string;
  title: string;
  tag_line: string;
  price: number;
  currency: string;
}
