import { useCallback, useMemo, useState } from "react";

import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import fetch from "node-fetch";
import crypto from "crypto";

import { Favorite, FavoriteRecord, FavoritesResponse, Module } from "../types";
import { extractPathAndParam } from "../utils/extractPathAndParam";
import useInstances from "./useInstances";

const useFavorites = () => {
  const { selectedInstance, userId } = useInstances();
  const [errorFetching, setErrorFetching] = useState<boolean>(false);

  const { name: instanceName = "", username = "", password = "" } = selectedInstance || {};
  const instanceUrl = `https://${instanceName}.service-now.com`;

  const {
    data: favorites,
    revalidate: revalidateFavorites,
    isLoading,
    mutate,
  } = useFetch(
    () => {
      return `${instanceUrl}/api/now/ui/favorite`;
    },
    {
      headers: {
        Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
      },
      execute: !!selectedInstance,
      onError: (error) => {
        setErrorFetching(true);
        console.error(error);
        showToast(Toast.Style.Failure, "Could not fetch favorites", error.message);
      },

      mapResult(response: { result: FavoritesResponse }) {
        if (response && response.result && Object.keys(response.result).length === 0) {
          setErrorFetching(true);
          showToast(Toast.Style.Failure, "Could not fetch favorites");
          return { data: [] };
        }

        setErrorFetching(false);
        return { data: response.result.list };
      },
      keepPreviousData: true,
    },
  );

  const favoritesGroups = useMemo(() => {
    if (!favorites) return [];
    return favorites
      .filter((favorite) => favorite.group)
      .map((favorite) => {
        return { applicationId: favorite.applicationId, id: favorite.id, title: favorite.title };
      });
  }, [favorites]);

  const favoritesData = useMemo(() => {
    if (!favorites) return [];
    const urlsParams: { id: string; path: string; param: string }[] = [];

    const recursiveExtract = (favorites: Favorite[]) => {
      favorites.forEach((favorite) => {
        let favoriteURL = favorite.url;
        if (favoriteURL) {
          if (!favoriteURL.startsWith("/")) {
            favoriteURL = "/" + favoriteURL;
          }
          urlsParams.push({ ...extractPathAndParam(favoriteURL), id: favorite.id });
        }

        if (favorite.favorites) {
          recursiveExtract(favorite.favorites);
        }
      });
    };

    recursiveExtract(favorites);
    return urlsParams;
  }, [favorites]);

  const isMenuInFavorites = (groupId: string) => {
    return favoritesGroups.find((favorite) => favorite.applicationId === groupId)?.id || "";
  };

  const isInFavorites = useCallback(
    (path: string) => {
      if (!favoritesData) return "";

      const menuURLData = extractPathAndParam(path);
      const favorite = favoritesData.find((favorite) => {
        return favorite.path == menuURLData.path && favorite.param == menuURLData.param;
      });
      return favorite?.id || "";
    },
    [favoritesData],
  );

  const _updateFavorites = async (
    request: { endpoint: string; method: string; body?: string },
    text: { before: string; success: string; failure: string },
    updateData: (data: Favorite[]) => Favorite[],
    successCallBack?: () => void,
  ) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: text.before });
    try {
      const response = await mutate(
        fetch(`${instanceUrl}${request.endpoint}`, {
          method: request.method,
          headers: {
            Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: request.body,
        }),
        {
          optimisticUpdate(data) {
            return updateData(data || []);
          },
        },
      );

      if (response.ok) {
        successCallBack?.();
        toast.style = Toast.Style.Success;
        toast.title = text.success;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = text.failure;
        toast.message = response.statusText;
      }
    } catch (error) {
      console.error(error);

      toast.style = Toast.Style.Failure;
      toast.title = text.failure;
      toast.message = error instanceof Error ? error.message : "";
    }
  };

  const addApplicationToFavorites = (application: string, title: string, modules: Module[]) => {
    const newFavoriteId = crypto.randomUUID().replace(/-/g, "");
    const body: FavoriteRecord = { sys_id: newFavoriteId, application, title, user: userId || "" };

    const applicationRequest = {
      id: "application",
      headers: [
        {
          name: "Content-Type",
          value: "application/json",
        },
      ],
      exclude_response_headers: true,
      url: "/api/now/table/sys_ui_bookmark_group",
      method: "POST",
      body: Buffer.from(JSON.stringify(body)).toString("base64"),
    };

    const moduleRequests: Array<{
      id: string;
      headers: { name: string; value: string }[];
      exclude_response_headers: boolean;
      url: string;
      method: string;
      body: string;
    }> = [];
    modules.forEach((module, index) => {
      const favoriteModules = module.type === "SEPARATOR" && module.modules ? module.modules : [module];
      favoriteModules.forEach((subModule, subIndex) => {
        const newFavoriteModuleId = crypto.randomUUID().replace(/-/g, "");

        const subFavoriteBody: FavoriteRecord = {
          sys_id: newFavoriteModuleId,
          module: subModule.id,
          group: newFavoriteId,
          title: subModule.title,
          url: subModule.uri,
          user: userId || "",
          icon: "star",
        };
        moduleRequests.push({
          id: `module_${index}_${subIndex}`,
          headers: [
            {
              name: "Content-Type",
              value: "application/json",
            },
          ],
          exclude_response_headers: true,
          url: "/api/now/table/sys_ui_bookmark",
          method: "POST",
          body: Buffer.from(JSON.stringify(subFavoriteBody)).toString("base64"),
        });
      });
    });

    const request = {
      endpoint: "/api/now/v1/batch",
      method: "POST",
      body: JSON.stringify({
        batch_request_id: "add-application-menu",
        rest_requests: [applicationRequest, ...moduleRequests],
      }),
    };

    const newFavorite = {
      id: newFavoriteId,
      applicationId: body.application,
      title: title,
      group: true,
      favorites: modules.map((module) => {
        return {
          id: crypto.randomUUID().replace(/-/g, ""),
          module: module.id,
          title: module.title,
          group: false,
          url: module.uri,
          groupId: newFavoriteId,
        };
      }),
    };

    const updateData = (data: Favorite[]) => {
      return [...data, newFavorite];
    };

    _updateFavorites(
      request,
      {
        before: `Adding ${title} to favorites`,
        success: `${title} added to favorites`,
        failure: "Failed adding favorite group",
      },
      updateData,
    );
  };

  const addModuleToFavorites = (module: string, title: string, url: string) => {
    const endpoint = "/api/now/table/sys_ui_bookmark";
    const newFavoriteId = crypto.randomUUID().replace(/-/g, "");
    const body: FavoriteRecord = { sys_id: newFavoriteId, module, title, url, user: userId || "", icon: "star" };

    const newFavorite = {
      id: newFavoriteId,
      module: body.module,
      title: title,
      group: false,
      url: body.url,
    };

    const request = {
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
    };

    const updateData = (data: Favorite[]) => {
      return [...data, newFavorite];
    };

    _updateFavorites(
      request,
      {
        before: `Adding ${title} to favorites`,
        success: `${title} added to favorites`,
        failure: "Failed adding favorite",
      },
      updateData,
    );
  };

  const addUrlToFavorites = (title: string, url: string, groupId?: string, revalidate?: () => void) => {
    const endpoint = "/api/now/table/sys_ui_bookmark";
    const newFavoriteId = crypto.randomUUID().replace(/-/g, "");
    const body: FavoriteRecord = {
      sys_id: newFavoriteId,
      title,
      url,
      user: userId || "",
      icon: "star",
      group: groupId,
    };

    const newFavorite = {
      id: newFavoriteId,
      title: title,
      group: false,
      url: body.url,
      groupId: groupId,
      favorites: [],
    };

    const request = {
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
    };

    const updateData = (data: Favorite[]) => {
      return [...data, newFavorite];
    };

    _updateFavorites(
      request,
      {
        before: `Adding ${title} to favorites`,
        success: `${title} added to favorites`,
        failure: "Failed adding favorite",
      },
      updateData,
      revalidate,
    );
  };

  const addFavoritesGroup = (title: string, revalidate?: () => void) => {
    const endpoint = `/api/now/table/sys_ui_bookmark_group`;
    const newFavoriteId = crypto.randomUUID().replace(/-/g, "");
    const body: FavoriteRecord = { sys_id: newFavoriteId, title, user: userId || "" };

    const newFavoriteGroup = {
      id: newFavoriteId,
      title: title,
      group: true,
    };

    const request = {
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
    };

    const updateData = (data: Favorite[]) => {
      return [...data, newFavoriteGroup];
    };

    _updateFavorites(
      request,
      {
        before: `Adding ${title} to favorites`,
        success: `${title} added to favorites`,
        failure: "Failed adding favorite group",
      },
      updateData,
      revalidate,
    );
  };

  const updateFavoritesGroup = (favoriteRecord: FavoriteRecord, revalidate?: () => void) => {
    const title = favoriteRecord.title;
    const endpoint = `/api/now/table/sys_ui_bookmark_group/${favoriteRecord.sys_id}`;

    const request = {
      endpoint,
      method: "PATCH",
      body: JSON.stringify(favoriteRecord),
    };

    const updateData = (data: Favorite[]) => {
      return data.map((favorite) => {
        if (favorite.id === favoriteRecord.sys_id) {
          return { ...favorite, title: favoriteRecord.title };
        }
        return favorite;
      });
    };

    _updateFavorites(
      request,
      {
        before: `Updating "${title}"`,
        success: `Favorites group updated`,
        failure: "Failed updating favorites group",
      },
      updateData,
      revalidate,
    );
  };

  const updateFavorite = (favoriteRecord: FavoriteRecord, revalidate?: () => void) => {
    const title = favoriteRecord.title;
    const endpoint = `/api/now/table/sys_ui_bookmark/${favoriteRecord.sys_id}`;

    const request = {
      endpoint,
      method: "PATCH",
      body: JSON.stringify(favoriteRecord),
    };

    const updateData = (data: Favorite[]) => {
      return data.map((favorite) => {
        if (favorite.id === favoriteRecord.sys_id) {
          return { ...favorite, title: favoriteRecord.title, url: favoriteRecord.url };
        }
        return favorite;
      });
    };

    _updateFavorites(
      request,
      {
        before: `Updating "${title}"`,
        success: `Favorite updated`,
        failure: "Failed updating favorite",
      },
      updateData,
      revalidate,
    );
  };

  const removeFromFavorites = async (id: string, title: string, isGroup: boolean, revalidate?: () => void) => {
    const endpoint = isGroup ? `/api/now/table/sys_ui_bookmark_group/${id}` : `/api/now/table/sys_ui_bookmark/${id}`;

    const request = {
      endpoint,
      method: "DELETE",
    };

    const updateData = (data: Favorite[]) => {
      return data.filter((favorite) => favorite.id !== id);
    };

    _updateFavorites(
      request,
      {
        before: `Removing ${title} from favorites`,
        success: `${title} removed from favorites`,
        failure: "Failed removing favorite",
      },
      updateData,
      revalidate,
    );
  };

  return {
    favorites,
    favoritesGroups,
    isLoading,
    errorFetching,
    isInFavorites,
    isMenuInFavorites,
    revalidateFavorites,
    addApplicationToFavorites,
    addModuleToFavorites,
    addUrlToFavorites,
    removeFromFavorites,
    updateFavorite,
    updateFavoritesGroup,
    addFavoritesGroup,
  };
};

export default useFavorites;
