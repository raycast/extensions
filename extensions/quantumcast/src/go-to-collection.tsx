import * as mongoose from "mongoose";
import { Icon, List, Action, ActionPanel, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Collection } from "./types";
import { mongoDB, mongoURL } from "./assets/preferences";
import { docUrlGoToCollection, cloudflowCollectionsUrl } from "./assets/globals";

// List collections of the database
async function getCollections() {
  const collectionList: Collection[] = [];
  mongoose.set('strictQuery', false);
  await mongoose.connect(`${mongoURL}/${mongoDB}`);

  const collections = await mongoose.connection.db.listCollections().toArray();

  //mongoose.disconnect()

  collections.forEach((collection) => {
    collectionList.push({
      name: collection.name,
      type: collection.name.startsWith("customobjects.") ? "Custom" : "System",
    });
  });
  return collectionList.sort((a, b) => {
    const titleA = a.name.toLowerCase();
    const titleB = b.name.toLowerCase();
    if (titleA < titleB) {
      return -1;
    }
    if (titleA > titleB) {
      return 1;
    }
    return 0;
  });
}

export default function Command() {
  const [collections, setColletions] = useState<Collection[]>([]);

  useEffect(() => {
    const fetchCollections = async () => {
      const data = await getCollections();
      setColletions(data);
    };
    fetchCollections();
  }, []);

  return (
    <List
      navigationTitle="Go to collection"
      searchBarPlaceholder="Select the collection to open in your default browser"
      isLoading={true}
    >
      {collections.map((collection) => (
        <List.Item
          id={collection.name}
          key={collection.name}
          title={collection.name.charAt(0).toUpperCase() + collection.name.slice(1)}
          icon="../assets/quantumcast-extension-icon.png"
          accessories={[{ text: `${collection.type}`, icon: collection.type === "Custom" ? Icon.Person : Icon.Gear }]}
          actions={
            <ActionPanel title="Quantumcast - Collection">
              <Action.OpenInBrowser url={`${cloudflowCollectionsUrl}${encodeURIComponent(collection.name)}`} />
              <Action.OpenInBrowser title="Open Documentation" url={docUrlGoToCollection} />
              {collection.type === "Custom" && (
                <Action title="Delete Custom Object" shortcut={{ modifiers: ["cmd"], key: "d" }} icon={Icon.Trash} onAction={async () => {
                  if (await confirmAlert({ title: `Are you sure that you want to delete the "${collection.name}" collection?` })) {
                    mongoose.connection.dropCollection(collection.name)
                    await showToast({ title: "Custom Object Deletion", message: "Done!" });
                  } else {
                    await showToast({ title: "Custom Object Deletion", message: "Canceled!" });
                  }
                }} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
