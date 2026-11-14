import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  addCardToFolder,
  getRecoveryHint,
  getUserFacingErrorMessage,
  listFolders,
  type RaycastCard,
  type RaycastFolder,
} from "../lib/api";
import { getCardTitle } from "../lib/cardDetailModel";
import { folderTint } from "../lib/folderColors";

interface AddToFolderListProps {
  card: RaycastCard;
  onCardUpdated: (card: RaycastCard) => void;
}

export function AddToFolderList({ card, onCardUpdated }: AddToFolderListProps) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<RaycastFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<string[]>(card.folderIds ?? []);

  useEffect(() => {
    let isMounted = true;
    listFolders("interactive")
      .then((response) => {
        if (isMounted) {
          setFolders(response.items);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(getUserFacingErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // A smart folder shows the cards its search finds, so cards can't be added.
  const manualFolders = useMemo(
    () => folders.filter((folder) => folder.kind === "manual"),
    [folders],
  );

  const handleAdd = async (folder: RaycastFolder) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding to ${folder.name}…`,
    });
    try {
      const result = await addCardToFolder(folder.id, card.id, "interactive");
      if (result.folderLimitIds.length > 0 || result.failedIds.length > 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't add to folder";
        toast.message =
          result.folderLimitIds.length > 0
            ? "That card is already in the most folders a card can be in."
            : "Teak couldn't add the card. Try again.";
        return;
      }
      const folderIds = Array.from(new Set([...addedTo, folder.id]));
      setAddedTo(folderIds);
      onCardUpdated({ ...card, folderIds });
      toast.style = Toast.Style.Success;
      toast.title = `Added to ${folder.name}`;
      pop();
    } catch (requestError) {
      const hint = getRecoveryHint(requestError);
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't add to folder";
      toast.message = hint
        ? `${getUserFacingErrorMessage(requestError)} ${hint}`
        : getUserFacingErrorMessage(requestError);
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Add to Folder: ${getCardTitle(card, 40)}`}
      searchBarPlaceholder="Find a folder…"
    >
      {error ? (
        <List.EmptyView
          description="Check your network connection, then try again."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}
      {!(error || isLoading) && manualFolders.length === 0 ? (
        <List.EmptyView
          description="Create a folder in Teak, then add cards to it from here."
          icon={Icon.Folder}
          title="No folders to add to"
        />
      ) : null}
      {manualFolders.map((folder) => (
        <List.Item
          accessories={
            addedTo.includes(folder.id)
              ? [
                  {
                    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                    tooltip: "Already in this folder",
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Folder}
                onAction={() => void handleAdd(folder)}
                title="Add to Folder"
              />
            </ActionPanel>
          }
          icon={{ source: Icon.Folder, tintColor: folderTint(folder.color) }}
          key={folder.id}
          subtitle={
            folder.cardCount === null
              ? undefined
              : `${folder.cardCount} card${folder.cardCount === 1 ? "" : "s"}`
          }
          title={folder.name}
        />
      ))}
    </List>
  );
}
