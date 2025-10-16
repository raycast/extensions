import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  openExtensionPreferences,
  open,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { BundleForm } from "./components/BundleForm";
import { useBundles } from "./hooks/useBundles";
import { getProfileNameByDirectory, openLinksInChrome } from "./utils/chrome";
import { fuzzySearchList } from "./utils/fuzzySearch";
import { Bundle } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const { bundles, isLoading, createBundle, editBundle, deleteBundle } = useBundles();
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const filteredBundles = useMemo(() => fuzzySearchList(bundles, searchText), [searchText, bundles]);

  const handleOpenBundle = async (bundle: Bundle) => {
    const { openInDefaultBrowser } = bundle;
    try {
      if (!openInDefaultBrowser) {
        await openLinksInChrome(bundle);
        await showToast(
          Toast.Style.Success,
          `Bundle opened in ${getProfileNameByDirectory(bundle.chromeProfileDirectory)} profile`,
        );
      } else {
        for (const link of [...bundle.links].reverse()) {
          await open(link);
        }
        await showToast(Toast.Style.Success, "Bundle opened in default browser");
      }
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to open bundle",
      });
    }
  };

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search bundles..."
      throttle
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Create Bundle"
            icon={Icon.Plus}
            onAction={() => push(<BundleForm onSubmit={createBundle} />)}
          />
        </ActionPanel>
      }
    >
      {filteredBundles.map((bundle, index) => (
        <List.Item
          key={bundle.title}
          icon={{ source: "../assets/icon_.png" }}
          title={bundle.title}
          subtitle={bundle.description}
          accessories={[
            bundle.openInDefaultBrowser
              ? {}
              : bundle.openInIncognitoWindow
                ? { icon: Icon.Person, tag: "Incognito" }
                : { tag: getProfileNameByDirectory(bundle.chromeProfileDirectory) },
            { icon: Icon.Link, text: `${bundle.links.length}` },
          ].filter(Boolean)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Open Bundle" icon={Icon.Globe} onAction={() => handleOpenBundle(bundle)} />
                <Action
                  title="Edit Bundle"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <BundleForm
                        bundle={bundle}
                        onSubmit={(updatedBundle: Bundle) => editBundle(index, updatedBundle)}
                      />,
                    )
                  }
                />
                <Action
                  title="Delete Bundle"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteBundle(index)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Create Bundle"
                  icon={Icon.Plus}
                  onAction={() => push(<BundleForm onSubmit={createBundle} />)}
                />
                <Action title="Configure Extension" icon={Icon.Cog} onAction={openExtensionPreferences} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
