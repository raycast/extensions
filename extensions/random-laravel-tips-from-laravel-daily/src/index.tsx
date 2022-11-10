import {Action, ActionPanel, Detail} from "@raycast/api";
import {useFetch} from "@raycast/utils";

export default function Command() {
    try {
        const {isLoading, data, revalidate}: any = useFetch("https://laraveldaily.com/api/v1/tips?count=1&format=markdown");
        const first = data.data[0];
        const markdown = `
# ${first.name}
---
${first.description}
---
![](${first.original_image})
---
Credit: [Laravel Daily](https://laraveldaily.com/)
`;

        return (
            <Detail
                isLoading={isLoading}
                markdown={markdown}
                actions={
                    <ActionPanel>
                        <Action title="Get Another Tip" onAction={() => revalidate()}/>
                    </ActionPanel>
                }
            />
        );
    } catch (e) {
        console.log((e as Error).message)
    }

}