import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export default function Command() {
  try {
    const { isLoading, data, revalidate }: any = useFetch(
      "https://laraveldaily.com/api/v1/tips?count=1&format=markdown"
    );
    const tipTitle = data.data[0].name;
    const tipDescription = data.data[0].description;
    const tipImage = data.data[0].original_image;

    const markdown = `
# ${tipTitle}
---
${tipDescription}
---
![](${tipImage})
---
Credit: [Laravel Daily](https://laraveldaily.com/)
`;
    return (
      <Detail
        isLoading={isLoading}
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Get Another Tip" onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    );
  } catch (e) {
    console.log((e as Error).message);
  }
}
