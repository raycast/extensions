import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ImageData, SMMSResponse, UserData } from "../types/types";
import Style = Toast.Style;
import { SM_MS_BASE_URL } from "../utils/costants";
import { Preferences } from "../types/preferences";
import { titleCase } from "../utils/common-utils";
import fse from "fs-extra";

export const secretToken = getPreferenceValues<Preferences>().secretToken;

export const getUserProfile = () => {
  const [userData, setUserData] = useState<UserData>({} as UserData);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    axios({
      method: "POST",
      url: SM_MS_BASE_URL + "/profile",
      headers: {
        Authorization: secretToken,
        "Content-Type": "multipart/form-data",
      },
      data: {},
    })
      .then((axiosResponse) => {
        const smmsResponse = axiosResponse.data as SMMSResponse;
        if (smmsResponse.success) {
          setUserData(smmsResponse.data as UserData);
        } else {
          showToast(Style.Failure, titleCase(smmsResponse.code), smmsResponse.message);
        }
        setLoading(false);
      })
      .catch((reason) => {
        showToast(Style.Failure, String(reason));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { userData: userData, loading: loading };
};

export const getUploadHistory = () => {
  const [uploadHistories, setUploadHistories] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    axios({
      method: "GET",
      url: SM_MS_BASE_URL + "/upload_history",
      headers: {
        Authorization: secretToken,
      },
    })
      .then((axiosResponse) => {
        const smmsResponse = axiosResponse.data as SMMSResponse;
        if (smmsResponse.success) {
          const imageData = smmsResponse.data as ImageData[];
          imageData.sort((a, b) => b.created_at.localeCompare(a.created_at));
          setUploadHistories(imageData);
        } else {
          showToast(Style.Failure, titleCase(smmsResponse.code), smmsResponse.message);
        }
        setLoading(false);

        //clear cache
        const cachePath = environment.supportPath + "/" + "Cache";
        fse.ensureDirSync(cachePath);
        fse.removeSync(cachePath);
      })
      .catch((reason) => {
        showToast(Style.Failure, String(reason));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { uploadHistories: uploadHistories, setUploadHistories: setUploadHistories, loading: loading };
};
