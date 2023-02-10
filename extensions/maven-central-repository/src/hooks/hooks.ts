import { useCallback, useEffect, useState } from "react";
import { isEmpty } from "../utils/common-utils";
import axios from "axios";
import { MAVEN_SEARCH } from "../utils/constants";
import { Doc, MavenModel } from "../utils/types";
import { showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

export const searchMavenArtifact = (searchContent: string) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (isEmpty(searchContent)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    axios({
      method: "GET",
      url: MAVEN_SEARCH,
      params: {
        q: searchContent,
        rows: "20",
        wt: "json",
      },
    })
      .then((response) => {
        setDocs((response.data as MavenModel).response.docs);
        setLoading(false);
      })
      .catch((reason) => {
        setLoading(false);
        showToast(Style.Failure, String(reason));
      });
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { docs: docs, loading: loading };
};
