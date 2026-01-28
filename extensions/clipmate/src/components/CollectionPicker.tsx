import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showHUD,
  closeMainWindow,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Collection } from "../types";
import { fetchCollections, createCollection, addLink, LimitExceededError } from "../services/graphql";
import { CreateCollectionForm } from "./CreateCollectionForm";
import { signOut } from "../services/authentication";

interface CollectionPickerProps {
  link: string;
}

export function CollectionPicker({ link }: CollectionPickerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);
      setNeedsAuth(false);

      const collectionsData = await fetchCollections();
      setCollections(collectionsData);
    } catch (error) {
      console.error("Error loading data:", error);
      if (
        error instanceof Error &&
        (error.message.includes("401") ||
          error.message.includes("Not authenticated") ||
          error.message.includes("Authentication"))
      ) {
        try {
          setError("Reconnecting to Clipmate...");
          const { authorize } = await import("../auth");
          await authorize();
          await loadData();
        } catch (authError) {
          setError("Authentication error. Please try again.");
          setNeedsAuth(true);
        }
      } else {
        setError(error instanceof Error ? error.message : "Unknown error loading data");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCollection = async (name: string, description: string, isPrivate: boolean, folderId?: string) => {
    try {
      setIsLoading(true);
      const newCollection = await createCollection({
        name,
        description,
        isPublic: !isPrivate,
        parentFolderId: folderId,
      });
      setCollections([newCollection, ...collections]);
      setSelectedCollections(new Set([newCollection.collectionId, ...selectedCollections]));
    } catch (error) {
      console.error("Error creating collection:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create collection",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCollection = (id: string) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCollections(newSelected);
  };

  const handleSave = async () => {
    try {
      await showHUD("Saving your link...");

      if (selectedCollections.size === 0) {
        // If no collections selected, just add the link to Clipmate
        await addLink({
          url: link,
        });

        await showHUD("✅ Saved to Clipmate");
      } else {
        // Save to selected collections
        const savePromises = Array.from(selectedCollections).map(async (collectionId) => {
          return addLink({
            url: link,
            collectionId,
          });
        });

        await Promise.all(savePromises);

        const successMessage = `Saved to ${selectedCollections.size} collection${selectedCollections.size > 1 ? "s" : ""}!`;
        await showHUD(successMessage);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      await popToRoot();
      await closeMainWindow();
    } catch (error) {
      console.error("Error saving link:", error);

      if (error instanceof LimitExceededError) {
        // Show limit exceeded error with upgrade options
        await showHUD("⚠️ Monthly limit reached");
        setError("limit_exceeded");
      } else {
        await showHUD("❌ Oops! Something went wrong");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await popToRoot();
        await closeMainWindow();
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Just go back to root - let the main component handle re-authentication
      await popToRoot();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (collection.description?.toLowerCase() || "").includes(searchText.toLowerCase()),
  );

  if (needsAuth && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="Please Sign In"
          description="Sign in to your Clipmate account to access your collections"
          icon={Icon.Person}
        />
      </List>
    );
  }

  if (error === "limit_exceeded" && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="You've reached your monthly limit"
          description="Upgrade to Pro or Essential to continue saving unlimited links"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Upgrade to Pro" url="https://app.clipmate.ai" icon={Icon.Globe} />
              <Action
                title="Go Back"
                onAction={() => {
                  setError(null);
                }}
                icon={Icon.ArrowLeft}
              />
              <Action
                title="Sign Out"
                onAction={handleSignOut}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error && error !== "limit_exceeded" && !needsAuth && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="Error Loading Collections"
          description={error}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={() => {
                  setIsLoading(true);
                  setError(null);
                  loadData();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Select Collections"
      searchBarPlaceholder="Search or create collections..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isLoading={isLoading}
    >
      <List.Section title="Actions">
        <List.Item
          title={selectedCollections.size > 0 ? "Add to Selected Collections" : "Add to Clipmate"}
          icon={Icon.SaveDocument}
          actions={
            <ActionPanel>
              <Action
                title={selectedCollections.size > 0 ? "Add to Selected Collections" : "Add to Clipmate"}
                onAction={handleSave}
                icon={Icon.SaveDocument}
              />
              <Action
                title="Sign Out"
                onAction={handleSignOut}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Collections" subtitle={`${selectedCollections.size} selected`}>
        <List.Item
          title={searchText && filteredCollections.length === 0 ? `Create "${searchText}"` : "Create New Collection"}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Collection"
                target={
                  <CreateCollectionForm
                    onSubmit={handleCreateCollection}
                    initialName={searchText && filteredCollections.length === 0 ? searchText : ""}
                  />
                }
                icon={Icon.Plus}
              />
              <Action
                title="Sign Out"
                onAction={handleSignOut}
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            </ActionPanel>
          }
        />
        {filteredCollections.map((collection) => (
          <List.Item
            key={collection.collectionId}
            title={collection.name}
            subtitle={collection.description || undefined}
            icon={{
              source: selectedCollections.has(collection.collectionId) ? Icon.CheckCircle : Icon.Circle,
              tintColor: selectedCollections.has(collection.collectionId) ? Color.Green : Color.SecondaryText,
            }}
            accessories={[
              { text: `${collection.itemCount} items` },
              { icon: collection.isPublic ? Icon.Globe : Icon.Lock },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={selectedCollections.has(collection.collectionId) ? "Deselect" : "Select"}
                  onAction={() => toggleCollection(collection.collectionId)}
                />
                <Action
                  title={selectedCollections.size > 0 ? "Add to Selected Collections" : "Add to Clipmate"}
                  onAction={handleSave}
                  icon={Icon.SaveDocument}
                />
                <Action
                  title="Sign Out"
                  onAction={handleSignOut}
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
