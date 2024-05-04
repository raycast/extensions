import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export interface State {
  message: string;
  status: string;
}

export default () => {
  const { isLoading, data, revalidate } = useFetch<State>("https://dog.ceo/api/breeds/image/random");

  const md = !isLoading && data?.message ? `${data.message} \n\n![](${data.message})` : "# Loading...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="New Image" onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
};
