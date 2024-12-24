import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useMemo } from "react";
import { BundleForm } from "./components/BundleForm";
import { useBundles } from "./hooks/useBundles";
import { getProfileNameByDirectory, openLinksInChrome } from "./utils/chrome";
import { fuzzySearchList } from "./utils/fuzzySearch";
import { decodeUrlSafely } from "./utils/url";

export default function Command() {
  const { bundles, isLoading, createBundle, editBundle, deleteBundle } = useBundles();
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const filteredBundles = useMemo(() => fuzzySearchList(bundles, searchText), [searchText, bundles]);

  const handleOpenBundle = async (links: string[], profile: string) => {
    try {
      // Decode each URL in the links array
      const decodedLinks = links.map(decodeUrlSafely);

      // Open the decoded links
      await openLinksInChrome(decodedLinks, profile, { newWindow: true });

      await showToast(Toast.Style.Success, `Bundle opened in ${profile} profile`);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to open bundle", String(error));
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
            { icon: Icon.Link, text: `${bundle.links.length}` },
            { tag: getProfileNameByDirectory(bundle.chromeProfile) },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Open Bundle"
                  icon={Icon.Globe}
                  onAction={() => handleOpenBundle(bundle.links, bundle.chromeProfile)}
                />
                <Action
                  title="Edit Bundle"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<BundleForm bundle={bundle} onSubmit={(updatedBundle) => editBundle(index, updatedBundle)} />)
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
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
