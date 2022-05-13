import { useCallback, useEffect, useState } from "react";
import { ArtifactTag, fetchArtifacts } from "../utils/google-maven-utils";
import { artifactModel } from "../model/packages-model";
import { showToast, Toast } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";
import { allPackagesURL } from "../utils/constans";
import { MavenModel } from "../model/maven-model";
import Style = Toast.Style;
import { isEmpty } from "../utils/common-utils";

//for refresh useState
export const refreshNumber = () => {
  return new Date().getTime();
};

export const searchArtifacts = (searchContent: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [artifactInfo, setArtifactInfo] = useState<{
    tagList: ArtifactTag[];
    artifactName: string[];
    artifactInfo: artifactModel[][];
  }>({
    tagList: [],
    artifactName: [],
    artifactInfo: [],
  });

  const fetchData = useCallback(async () => {
    if (isEmpty(searchContent) || searchContent.length < 4) {
      return;
    }
    setLoading(true);
    try {
      setArtifactInfo(await fetchArtifacts(searchContent));
    } catch (e) {
      console.error(String(e));
      await showToast(Style.Failure, String(e));
    }
    setLoading(false);
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { artifactInfo: artifactInfo, loading: loading };
};

export const getGoogleMavenRepositories = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [allPackages, setAllPackages] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      fetch(allPackagesURL)
        .then((response) => response.json() as Promise<MavenModel>)
        .then((data) => {
          setAllPackages(data.data);
          setLoading(false);
        })
        .catch((reason) => {
          setAllPackages([]);
          setLoading(false);
          showToast(Style.Failure, String(reason));
        });
    } catch (e) {
      if (e instanceof AbortError) {
        return;
      }
      console.error(String(e));
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { allPackages: allPackages, loading: loading };
};
