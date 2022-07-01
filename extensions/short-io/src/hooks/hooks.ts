import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { DOMAINS_API, LIST_LINK_API, LocalStorageKey } from "../utils/constants";
import { Alert, confirmAlert, getPreferenceValues, Icon, LocalStorage } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { Domain, ListLinksResponse, ShortLink } from "../types/types";
import { isEmpty } from "../utils/common-utils";

export const apiKey = getPreferenceValues<Preferences>().apiKey;

export const getAllDomains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.DOMAIN_CACHE);
    const _localDomainCache = typeof localStorage === "undefined" ? [] : (JSON.parse(localStorage) as Domain[]);

    if (_localDomainCache.length === 0) {
      axios
        .get(DOMAINS_API, {
          headers: {
            accept: "application/json",
            authorization: apiKey,
          },
        })
        .then(function (response) {
          const _domains = response.data as Domain[];
          setDomains(_domains);
          setLoading(false);

          LocalStorage.setItem(LocalStorageKey.DOMAIN_CACHE, JSON.stringify(_domains));
        })
        .catch(function (response) {
          console.error(String(response));
          setLoading(false);
        });
    } else {
      setDomains(_localDomainCache);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { domains: domains, loading: loading };
};

export const getDefaultDomain = (paraDomain: string) => {
  const [domain, setDomain] = useState<string>(paraDomain);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (!isEmpty(paraDomain)) {
      setDomain(paraDomain);
      setLoading(false);
    } else {
      const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.DEFAULT_DOMAIN);
      if (typeof localStorage !== "undefined") {
        setDomain((JSON.parse(localStorage) as Domain).hostname);
        setLoading(false);
      } else {
        const domainResponse = await axios.get(DOMAINS_API, {
          headers: {
            accept: "application/json",
            authorization: apiKey,
          },
        });
        const _domains = domainResponse.data as Domain[];
        if (_domains.length > 0) {
          setDomain(_domains[0].hostname);
          await LocalStorage.setItem(LocalStorageKey.DEFAULT_DOMAIN, JSON.stringify(_domains[0]));
        } else {
          setDomain("");
        }
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { defaultDomain: domain, domainLoading: loading };
};

export const getShortLinks = (refresh: number) => {
  const [shortLinks, setShortLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    let domainID = -1;
    const localStorage = await LocalStorage.getItem<string>(LocalStorageKey.DEFAULT_DOMAIN);

    if (typeof localStorage !== "undefined") {
      domainID = (JSON.parse(localStorage) as Domain).id;
    } else {
      const _domains = (
        await axios.get(DOMAINS_API, {
          headers: {
            accept: "application/json",
            authorization: apiKey,
          },
        })
      ).data as Domain[];
      if (_domains.length > 0) {
        domainID = _domains[0].id;
        await LocalStorage.setItem(LocalStorageKey.DEFAULT_DOMAIN, JSON.stringify(_domains[0]));
      }
    }
    if (domainID !== -1) {
      const listLinksResponse = (
        await axios.get(LIST_LINK_API, {
          params: {
            domain_id: domainID,
            limit: "150",
            offset: "0",
          },
          headers: {
            accept: "application/json",
            authorization: apiKey,
          },
        })
      ).data as ListLinksResponse;
      setShortLinks(listLinksResponse.links);
    }
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { shortLinks: shortLinks, setShortLinks: setShortLinks, loading: loading };
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
