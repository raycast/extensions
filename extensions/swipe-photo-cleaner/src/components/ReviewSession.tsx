import {
  ActionPanel,
  Action,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useCallback, useRef, useState } from "react";
import { PhotoItem } from "../types";
import { useSessionState } from "../hooks/useSessionState";
import { moveToPendingTrash, restoreFromPendingTrash } from "../lib/trash";
import { formatSize, getThumbnail } from "../lib/images";
import { SummaryView } from "./SummaryView";

function encodeFilePath(filePath: string): string {
  return filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function ReviewSession({ photos }: { photos: PhotoItem[] }) {
  const [state, dispatch] = useSessionState(photos);
  const { push } = useNavigation();
  const isBusy = useRef(false);

  useEffect(() => {
    if (state.isComplete) {
      push(<SummaryView state={state} />);
    }
  }, [push, state, state.isComplete]);

  const handleKeep = useCallback(() => {
    if (isBusy.current) return;
    dispatch({ type: "keep" });
  }, [dispatch]);

  const handleTrash = useCallback(async () => {
    if (isBusy.current) return;
    isBusy.current = true;
    const current = state.photos[state.currentIndex];
    try {
      const pendingPath = await moveToPendingTrash(current.path);
      dispatch({ type: "trash", pendingTrashPath: pendingPath });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to trash",
        message: String(err),
      });
    } finally {
      isBusy.current = false;
    }
  }, [dispatch, state.currentIndex, state.photos]);

  const handleUndo = useCallback(async () => {
    if (isBusy.current) return;
    if (state.actions.length === 0) return;
    isBusy.current = true;
    const lastAction = state.actions[state.actions.length - 1];
    try {
      if (lastAction.kind === "trash" && lastAction.pendingTrashPath) {
        await restoreFromPendingTrash(
          lastAction.pendingTrashPath,
          lastAction.photo.path,
        );
      }
      dispatch({ type: "undo" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to undo",
        message: String(err),
      });
    } finally {
      isBusy.current = false;
    }
  }, [dispatch, state.actions]);

  const currentPhoto = state.isComplete
    ? null
    : state.photos[state.currentIndex];
  const [thumbPath, setThumbPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!currentPhoto) {
      setThumbPath(null);
      return () => {
        cancelled = true;
      };
    }

    setThumbPath(null);

    void getThumbnail(currentPhoto.path).then((thumbPath) => {
      if (!cancelled) {
        setThumbPath(thumbPath);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentPhoto?.path]);

  if (photos.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Photos Found"
          description="The selected folder contains no image files."
          icon={Icon.Image}
        />
      </List>
    );
  }

  if (state.isComplete || !currentPhoto) {
    return <Detail isLoading />;
  }

  const current = currentPhoto;
  const displayPath = thumbPath ?? current.path;
  const encodedPath = encodeFilePath(displayPath);
  const markdown = `![${current.name}](file://${encodedPath})`;

  return (
    <Detail
      navigationTitle={`${current.name} — ${state.currentIndex + 1} / ${photos.length}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Size" text={formatSize(current.size)} />
          <Detail.Metadata.Label
            title="Date"
            text={current.createdAt.toLocaleDateString("en-US")}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Kept"
            text={String(state.kept)}
            icon={Icon.Checkmark}
          />
          <Detail.Metadata.Label
            title="Trashed"
            text={String(state.trashed)}
            icon={Icon.Trash}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Review">
            <Action
              title="Keep"
              icon={Icon.Checkmark}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={handleKeep}
            />
            <Action
              title="Move to Trash"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={handleTrash}
            />
            <Action
              title="Undo"
              icon={Icon.Undo}
              shortcut={{ modifiers: ["cmd"], key: "z" }}
              onAction={handleUndo}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <Action.ShowInFinder
              path={current.path}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.ToggleQuickLook
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
