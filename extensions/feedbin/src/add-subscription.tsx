import {
  Action,
  ActionPanel,
  Form,
  LaunchProps,
  Toast,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { MultipleFeeds, createSubscription } from "./utils/api";
import { closeAndShowToast } from "./utils/closeAndShowToast";
import { getUrl } from "./utils/getUrl";
import { refreshMenuBar } from "./utils/refreshMenuBar";

function AddMultipleFeeds(props: { feeds: MultipleFeeds }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: Record<string, boolean>) => {
              const feeds = Object.entries(values)
                .filter(([, value]) => value)
                .map(([key]) => key);
              showToast(
                Toast.Style.Animated,
                `Subscribing to ${feeds.length} feed${
                  feeds.length === 1 ? "" : "s"
                }...`,
              );

              await Promise.all(feeds.map(createSubscription));
              closeAndShowToast(
                Toast.Style.Success,
                feeds.length === 1
                  ? `Subscribed to ${feeds[0]}`
                  : `Subscribed to ${feeds.length} feeds`,
              );
              refreshMenuBar();
            }}
          />
        </ActionPanel>
      }
    >
      {props.feeds.map(({ feed_url, title }) => (
        <Form.Checkbox
          key={feed_url}
          defaultValue={true}
          id={feed_url}
          label={feed_url}
          title={title}
        />
      ))}
    </Form>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: Arguments.AddSubscription }>,
): JSX.Element {
  const { push } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const url = await getUrl(props.arguments.url);
        if (url === undefined) return;

        showToast(Toast.Style.Animated, "Checking for feeds...");
        const result = await createSubscription(url.toString());
        setIsLoading(false);
        if (Array.isArray(result)) {
          showToast(Toast.Style.Success, "Multiple feeds found");
          push(<AddMultipleFeeds feeds={result} />);
          return;
        } else if ("feed_url" in result) {
          closeAndShowToast(
            Toast.Style.Success,
            `Subscribed to ${result.feed_url}`,
          );
          refreshMenuBar();
          return;
        } else if (result.status === 404) {
          closeAndShowToast(Toast.Style.Failure, "No feeds found");
          return;
        } else {
          closeAndShowToast(Toast.Style.Failure, "Unknown error");
          return;
        }
      } catch (error) {
        popToRoot({ clearSearchBar: false });
        showToast(Toast.Style.Failure, "Unable to get selected text");
      }
    })();
  }, []);

  return <Form isLoading={isLoading} />;
}
