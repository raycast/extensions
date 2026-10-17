import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { getSelectedFinderItems } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { expandHome } from "./fs-utils";
import { TransferTree } from "./transfer-tree";

function getPrefs(): Preferences.FinderSelection {
  try {
    return getPreferenceValues<Preferences.FinderSelection>();
  } catch {
    return {
      startingPath: "~",
      startBehavior: "start",
      showHiddenDefault: false,
      transferStart: "home",
    };
  }
}

/**
 * Transfer Finder Selection: takes whatever is selected in Finder right now
 * and runs it through the same transfer tree as Tab (browse destination,
 * Enter on a folder transfers into it, then Copy vs Move). Never touches
 * the X-basket from the main browser.
 */
export default function Command() {
  const p = getPrefs();
  const home = expandHome(p.startingPath || "~");

  const { data, isLoading, revalidate } = usePromise(async () => {
    try {
      const items = await getSelectedFinderItems();
      return items.map((item) => item.path);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Finder selection",
        message: "Select files in Finder first, then run this command",
      });
      return [] as string[];
    }
  }, []);

  if (isLoading) {
    return (
      <List isLoading={true} searchBarPlaceholder="Reading Finder selection…" />
    );
  }

  if (!data || data.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Finder}
          title="No Finder selection"
          description="Select files or folders in Finder, then run again"
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <TransferTree
      sources={data}
      initialPath={home}
      showHidden={!!p.showHiddenDefault}
      onDone={() => undefined}
      manageBasket={false}
    />
  );
}
