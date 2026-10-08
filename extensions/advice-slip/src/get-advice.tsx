import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Advice = {
  slip: {
    id: number;
    advice: string;
  };
};

export default function Command() {
  const { isLoading, data, revalidate } = useFetch<Advice>("https://api.adviceslip.com/advice", {
    keepPreviousData: false,
    headers: {
      Accept: "application/json",
    },
    async parseResponse(response: Response) {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.text();
      if (data !== undefined) {
        return JSON.parse(data);
      }

      return undefined;
    },
  });

  const advice = !isLoading && data?.slip?.advice ? data?.slip?.advice : "Loading...";
  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${advice.replaceAll(/\n/g, "\n# ")}`}
      actions={
        <ActionPanel>
          <Action title="New Advice Slip" onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
