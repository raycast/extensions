import { Toast, showToast } from "@raycast/api";
import { authorize } from "./oauth";
import { Response } from "../webflow/interfaces";
import { Webflow, WebflowClient, WebflowError } from "webflow-api";
import { useEffect, useState } from "react";

let webflowApi: WebflowClient | null = null;

export async function authorizeIfNeeded(): Promise<void> {
  try {
    const accessToken = await authorize();
    webflowApi = new WebflowClient({ accessToken });
  } catch (error) {
    console.error("Authorization error:", error);
    showToast({ style: Toast.Style.Failure, title: "Failed to authorize with Webflow", message: String(error) });
  }
}

export function getWebflowApi(): WebflowClient | null {
  return webflowApi;
}

export function getSites(): Response<Webflow.Sites> {
  const [response, setResponse] = useState<Response<Webflow.Sites>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();
      const api = getWebflowApi();

      if (!api) {
        return;
      }

      if (cancel) {
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await api.sites
            .list()
            .then((response) => response)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as WebflowError).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: unknown) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as WebflowError).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return response;
}

export function getPages(siteId: string): Response<Webflow.PageList> {
  const [response, setResponse] = useState<Response<Webflow.PageList>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();
      const api = getWebflowApi();

      if (!api) {
        return;
      }

      if (cancel) {
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await api.pages
            .list(siteId)
            .then((response) => response)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as WebflowError).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: unknown) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as WebflowError).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return response;
}

export function getCMSCollections(siteId: string): Response<Webflow.CollectionList> {
  const [response, setResponse] = useState<Response<Webflow.CollectionList>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();
      const api = getWebflowApi();

      if (!api) {
        return;
      }

      if (cancel) {
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await api.collections
            .list(siteId)
            .then((response) => response)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as WebflowError).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: unknown) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as WebflowError).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return response;
}

export function getCMSItems(collectionId: string): Response<Webflow.CollectionItemList> {
  const [response, setResponse] = useState<Response<Webflow.CollectionItemList>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();
      const api = getWebflowApi();

      if (!api) {
        return;
      }

      if (cancel) {
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await api.collections.items
            .listItems(collectionId)
            .then((response) => response)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as WebflowError).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: unknown) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as WebflowError).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return response;
}

export async function publishCMSItem(collectionId: string, itemId: string): Promise<boolean | string> {
  try {
    await webflowApi?.collections.items
      .publishItem(collectionId, {
        itemIds: [itemId],
      })
      .then((response) => response)
      .catch((error) => {
        console.error("Error updating item:", error);
        return (error as unknown as WebflowError).message;
      });
    return true;
  } catch (error: unknown) {
    console.error("Error publishing site:", error);
    return (error as unknown as WebflowError).message;
  }
}

export async function draftCMSItem(collectionId: string, itemId: string): Promise<boolean | string> {
  try {
    await webflowApi?.collections.items
      .updateItem(
        collectionId,
        itemId,
        {
          id: itemId,
          isDraft: true,
        },
        {
          maxRetries: 3,
        },
      )
      .then((response) => response)
      .catch((error) => {
        console.error("Error updating item:", error);
        return (error as unknown as WebflowError).message;
      });
    return true;
  } catch (error: unknown) {
    console.error("Error publishing site:", error);
    return (error as unknown as WebflowError).message;
  }
}

export async function publishSite(siteId: string): Promise<void | string> {
  try {
    const response = await webflowApi?.sites.publish(siteId, {
      publishToWebflowSubdomain: true,
    });
    return response;
  } catch (error: unknown) {
    console.error("Error publishing site:", error);
    return (error as unknown as WebflowError).message;
  }
}
