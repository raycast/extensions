import { confirmAlert, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { errorHandler } from "../utils/helpers";
import { Status, MastodonError } from "../utils/types";
import apiServer from "../utils/api";

export function useInteract(status: Status) {
  const [statusInfo, setStatusInfo] = useState({
    reblogsCount: status.reblogs_count,
    reblogged: status.reblogged,
    favourited: status.favourited,
    favouritesCount: status.favourites_count,
    bookmarked: status.bookmarked,
  });

  const toggleReblog = async (status: Status) => {
    try {
      if (status.reblogged && statusInfo.reblogged) {
        showToast(Toast.Style.Animated, "Undoing the boost of the status ...");
        apiServer.undoReblogStatus(status.id);
        showToast(Toast.Style.Success, "Boost undo successful.");
        setStatusInfo({
          ...statusInfo,
          reblogsCount: status.reblogs_count - 1,
          reblogged: false,
        });
      } else {
        showToast(Toast.Style.Animated, "Boosting the status ...");
        await apiServer.reblogStatus(status.id);
        showToast(Toast.Style.Success, "Boosted!");
        setStatusInfo({
          ...statusInfo,
          reblogsCount: status.reblogs_count + 1,
          reblogged: true,
        });
      }
    } catch (error) {
      errorHandler(error as MastodonError);
    }
  };

  const toggleFavourite = async (status: Status) => {
    try {
      if (status.favourited && statusInfo.favourited) {
        showToast(Toast.Style.Animated, "Undoing the favourite of the status ...");
        apiServer.undoFavouriteStatus(status.id);
        showToast(Toast.Style.Success, "Favourite undo successful.");
        setStatusInfo({
          ...statusInfo,
          favourited: false,
          favouritesCount: status.favourites_count - 1,
        });
      } else {
        showToast(Toast.Style.Animated, "Favouriting the status...");
        await apiServer.favouriteStatus(status.id);
        showToast(Toast.Style.Success, "Favourite successful!");
        setStatusInfo({
          ...statusInfo,
          favourited: true,
          favouritesCount: status.favourites_count + 1,
        });
      }
    } catch (error) {
      errorHandler(error as MastodonError);
    }
  };

  const toggleBookmark = async (status: Status) => {
    try {
      if (status.bookmarked && statusInfo.bookmarked) {
        showToast(Toast.Style.Animated, "Removing Bookmark");
        apiServer.undoBookmarkStatus(status.id);
        showToast(Toast.Style.Success, "Bookmark removed.");
        setStatusInfo({
          ...statusInfo,
          bookmarked: false,
        });
      } else {
        showToast(Toast.Style.Animated, "Bookmarking status... ");
        apiServer.bookmarkStatus(status.id);
        showToast(Toast.Style.Success, "Bookmarks added!");
        setStatusInfo({
          ...statusInfo,
          bookmarked: true,
        });
      }
    } catch (error) {
      errorHandler(error as MastodonError);
    }
  };

  const deleteStatus = async (status: Status) => {
    try {
      if (!(await confirmAlert({ title: "Are you sure?" }))) return;
      showToast(Toast.Style.Animated, "Deleting the status...");
      await apiServer.deleteStatus(status.id);
      showToast(Toast.Style.Success, "Status deleted.");
    } catch (error) {
      errorHandler(error as MastodonError);
    }
  };

  return {
    statusInfo,
    toggleReblog,
    toggleFavourite,
    toggleBookmark,
    deleteStatus,
  };
}
