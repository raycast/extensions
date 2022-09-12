import { useCallback, useEffect, useState } from "react";
import { fetchItemInput, ItemInput } from "../utils/input-utils";
import { Alert, confirmAlert, getApplications, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { boardsSort } from "../utils/open-link-utils";
import { suggestApps } from "../utils/constants";
import { ItemType, LocalStorageKey, OpenLinkApplication } from "../types/types";

export const getItemInput = (refresh: number) => {
  const [itemInput, setItemInput] = useState<ItemInput>(new ItemInput());

  const fetchData = useCallback(async () => {
    const inputItem = await fetchItemInput();
    if (inputItem.type == ItemType.NULL) {
      await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
    } else {
      setItemInput(inputItem);
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { itemInput: itemInput };
};

export const getOpenLinkApp = (itemInput: ItemInput, refresh: number) => {
  const [buildInApps, setBuildInApps] = useState<OpenLinkApplication[]>([]);
  const [customApps, setCustomApps] = useState<OpenLinkApplication[]>([]);
  const [otherApps, setOtherApps] = useState<OpenLinkApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const allApplications = await getApplications();

    //custom apps
    const localBrowsers = await LocalStorage.getItem<string>(LocalStorageKey.CUSTOM_APPS);
    const _customApps: OpenLinkApplication[] = typeof localBrowsers == "string" ? JSON.parse(localBrowsers) : [];

    const _customAppPaths = _customApps.map((value) => value.path);
    const _buildInPaths = suggestApps.map((value) => value.path);

    const _buildInApps: OpenLinkApplication[] = [];
    const _otherApps: OpenLinkApplication[] = [];

    allApplications.forEach((value) => {
      const suggestIncludeIndex = _buildInPaths.indexOf(value.path);
      const customInclude = _customAppPaths.includes(value.path);
      if (suggestIncludeIndex !== -1 && !customInclude) {
        //build-in apps
        _buildInApps.push({
          bundleId: value.bundleId,
          name: value.name,
          path: value.path,
          rankText: suggestApps[suggestIncludeIndex].rank,
          rankURL: suggestApps[suggestIncludeIndex].rank,
          rankEmail: suggestApps[suggestIncludeIndex].rank,
        });
      } else if (!value.bundleId?.startsWith("com.apple") && !value.path.startsWith("/System") && !customInclude) {
        //other apps
        _otherApps.push({
          bundleId: value.bundleId,
          name: value.name,
          path: value.path,
          rankText: 1,
          rankURL: 1,
          rankEmail: 1,
        });
      }
    });

    _buildInApps.sort((a, b) => a.rankURL - b.rankURL);
    setCustomApps(boardsSort(_customApps, itemInput));
    setBuildInApps(_buildInApps);
    setOtherApps(_otherApps);
    setLoading(false);
  }, [itemInput, refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { buildInApps: buildInApps, customApps: customApps, otherApps: otherApps, loading: loading };
};

export const alertDialog = async (
  icon: Icon,
  title: string,
  message: string,
  confirmTitle: string,
  confirmAction: () => void,
  cancelAction?: () => void
) => {
  const options: Alert.Options = {
    icon: icon,
    title: title,
    message: message,
    primaryAction: {
      title: confirmTitle,
      onAction: confirmAction,
    },
    dismissAction: {
      title: "Cancel",
      onAction: () => cancelAction,
    },
  };
  await confirmAlert(options);
};
