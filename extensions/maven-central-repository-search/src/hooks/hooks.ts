import { useCallback, useEffect, useState } from "react";
import { isEmpty } from "../utils/common-utils";
import axios from "axios";
import { MAVEN_SEARCH } from "../utils/constants";
import { Doc, MavenModel } from "../utils/types";

export const searchMavenArtifact = (searchContent: string) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (isEmpty(searchContent)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const axiosResponse = await axios({
        method: "GET",
        url: MAVEN_SEARCH,
        params: {
          q: searchContent,
          rows: "20",
          wt: "json",
        },
      });
      const mavenModel = axiosResponse.data as MavenModel;
      const docs = mavenModel.response.docs;
      setDocs(docs);
    } catch (e) {
      console.error(String(e));
    }
    setLoading(false);
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { docs: docs, loading: loading };
};
