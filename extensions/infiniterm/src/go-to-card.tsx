import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CardList } from "./components/card-list.tsx";
import { focusCard, supportsFocus } from "./lib/ift.ts";

export default function Command() {
  const { data: supported, isLoading } = useCachedPromise(supportsFocus, [], { keepPreviousData: false });

  // An ift without the verb would open an editor card for a file called "focus", so the list is not offered at all.
  if (supported === false) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="This ift has no focus verb yet"
          description="Needs an infiniterm release with ift focus. Check the ift Path preference if you expected it."
        />
      </List>
    );
  }
  if (isLoading || supported === undefined) return <List isLoading />;

  return (
    <CardList
      actions={(card) => (
        <ActionPanel>
          <Action title="Go to Card" icon={Icon.ArrowRight} onAction={() => focusCard(card)} />
        </ActionPanel>
      )}
    />
  );
}
