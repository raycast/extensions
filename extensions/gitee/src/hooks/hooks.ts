import { useCallback, useEffect, useState } from "react";
import {
  GET_REPO_README,
  GET_USER_REPOS,
  ISSUE_PER_PAGE,
  NOTIFICATION_PER_PAGE,
  NOTIFICATIONS,
  PER_PAGE,
  SEARCH_REPOS,
  USER_ISSUES,
} from "../utils/constants";
import { commonPreferences, isEmpty } from "../utils/common-utils";
import axios from "axios";
import { Repository } from "../types/repository";
import { Issue } from "../types/issue";
import { Readme } from "../types/readme";
import { Notification, NotificationResponse } from "../types/notification";
import { showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

const accessToken = commonPreferences().accessToken;

export const getUserRepos = (page: number) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    axios({
      method: "GET",
      url: GET_USER_REPOS,
      params: {
        access_token: accessToken,
        sort: "full_name",
        page: page,
        per_page: PER_PAGE,
      },
    })
      .then((response) => {
        setRepos([...repos, ...(response.data as Repository[])]);
        setLoading(false);
      })
      .catch((reason) => {
        setLoading(false);
        console.error(String(reason));
        showToast(Style.Failure, String(reason));
      });
  }, [page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { repos: repos, loading: loading };
};

export const searchRepos = (searchContent: string) => {
  const [userRepos, setUserRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (isEmpty(searchContent)) {
      setLoading(false);
      return;
    }
    setLoading(true);

    axios({
      method: "GET",
      url: SEARCH_REPOS,
      params: {
        access_token: accessToken,
        q: searchContent,
        page: 1,
        per_page: PER_PAGE,
        order: "desc",
      },
    })
      .then((response) => {
        setUserRepos(response.data as Repository[]);
        setLoading(false);
      })
      .catch((reason) => {
        setLoading(false);
        console.error(String(reason));
        showToast(Style.Failure, String(reason));
      });
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { repos: userRepos, loading: loading };
};

export const myIssues = (filter: string) => {
  const [openIssues, setOpenIssues] = useState<Issue[]>([]);
  const [progressingIssues, setProgressingIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    axios({
      method: "GET",
      url: USER_ISSUES,
      params: {
        access_token: accessToken,
        filter: filter,
        state: "open",
        sort: "created",
        direction: "desc",
        page: 1,
        per_page: PER_PAGE,
      },
    })
      .then((response1) => {
        setOpenIssues(response1.data as Issue[]);
        axios({
          method: "GET",
          url: USER_ISSUES,
          params: {
            access_token: accessToken,
            filter: filter,
            state: "progressing",
            sort: "created",
            direction: "desc",
            page: 1,
            per_page: ISSUE_PER_PAGE,
          },
        }).then((response2) => {
          setProgressingIssues(response2.data as Issue[]);
          setLoading(false);
        });
      })
      .catch((reason) => {
        setLoading(false);
        console.error(String(reason));
        showToast(Style.Failure, String(reason));
      });
  }, [filter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { openIssues: openIssues, progressingIssues: progressingIssues, loading: loading };
};

export const getRepoREADME = (owner: string, repo: string) => {
  const [readme, setReadme] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    axios({
      method: "GET",
      url: GET_REPO_README(owner, repo),
      params: {
        access_token: accessToken,
      },
    })
      .then((response) => {
        setReadme(Buffer.from((response.data as Readme).content, "base64").toString("utf-8"));
        setLoading(false);
      })
      .catch((reason) => {
        setLoading(false);
        console.error(String(reason));
        showToast(Style.Failure, String(reason));
      });
  }, [owner, repo]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { readme: readme, loading: loading };
};

export const getNotifications = (filter: string, refresh: number) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    axios({
      method: "GET",
      url: NOTIFICATIONS,
      params: {
        access_token: accessToken,
        type: filter,
        page: "1",
        per_page: NOTIFICATION_PER_PAGE,
      },
    })
      .then((response) => {
        setNotifications((response.data as NotificationResponse).list);
        setLoading(false);
      })
      .catch((reason) => {
        setLoading(false);
        console.error(String(reason));
        showToast(Style.Failure, String(reason));
      });
  }, [filter, refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { notifications: notifications, loading: loading };
};

export const setNotificationRead = async (id: number) => {
  await axios({
    method: "PATCH",
    url: NOTIFICATIONS + "/" + id,
    params: {
      access_token: accessToken,
    },
    data: {},
  });

  return new Date().getTime();
};
