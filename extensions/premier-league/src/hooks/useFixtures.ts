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
  const [fixtures, setFixtures] = useState<Content[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastPage, setLastPage] = useState<boolean>(false);

  useEffect(() => {
    props.page = 0;
    setLoading(true);
    setFixtures([]);

    getFixtures(props).then(([data, lastPage]) => {
      setFixtures(data);
      setLastPage(lastPage);
      setLoading(false);
    });
  }, [props.teams]);

  useEffect(() => {
    setLoading(true);

    getFixtures(props).then(([data, lastPage]) => {
      const matches = fixtures.concat(data);
      setFixtures(matches);
      setLastPage(lastPage);
      setLoading(false);
    });
  }, [props.page]);

  return { fixtures, loading, lastPage };
};

export default useFixtures;
