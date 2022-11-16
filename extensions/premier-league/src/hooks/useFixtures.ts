import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFixtures } from "../api";
import { Content } from "../types";

interface PropsType {
  teams: string;
  page: number;
  sort: string;
  statuses: string;
}

const useFixtures = (props: PropsType) => {
  const [fixtures, setFixtures] = useState<Content[]>();
  const [lastPage, setLastPage] = useState<boolean>(false);

  useEffect(() => {
    props.page = 0;
    setFixtures(undefined);

    getFixtures(props).then(([data, lastPage]) => {
      setFixtures(data);
      setLastPage(lastPage);
    });
  }, [props.teams]);

  useEffect(() => {
    showToast({
      title: "Loading Content",
      style: Toast.Style.Animated,
    });
    getFixtures(props).then(([data, lastPage]) => {
      const matches = (fixtures || []).concat(data);
      setFixtures(matches);
      setLastPage(lastPage);
      showToast({
        title: "Completed",
        style: Toast.Style.Success,
      });
    });
  }, [props.page]);

  return { fixtures, lastPage };
};

export default useFixtures;
