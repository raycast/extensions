import { popToRoot, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { createMusicThreadApiAxiosInstance } from "../fetchers/fetcher";
import { Thread } from "../types/threads.types";
import { Link } from "../types/links.types";
import { naturalSort } from "../utils/naturalSort.utils";

const showUnauthorizedErrorToast = async () => {
  await showToast({
    title: "MusicThread API Error",
    message: "Try again after checking your MusicThread token.",
    style: Toast.Style.Failure,
  });
  await popToRoot({ clearSearchBar: true });
};

export const useMusicThreadHttpApi = () => {
  const { personalAccessToken }: { personalAccessToken: string } = getPreferenceValues();

  const axiosInstance = createMusicThreadApiAxiosInstance(personalAccessToken);

  const getThreads = async () => {
    try {
      const { data } = await axiosInstance.get<{ threads: Array<Thread> }>("/threads");
      const threads = data?.threads.length ? naturalSort<Thread>(data.threads, { key: "title" }) : [];
      return threads;
    } catch (error) {
      await showUnauthorizedErrorToast();
      return [];
    }
  };

  const addLink = async (link: Link) => {
    const payload = {
      url: link.link,
      thread: link.dropdown,
    };
    try {
      return await axiosInstance.post("/add-link", payload);
    } catch (error) {
      await showUnauthorizedErrorToast();
      return [];
    }
  };

  const createThread = async (thread: Thread) => {
    const payload = {
      title: thread.title,
      description: thread.description,
    };
    try {
      return await axiosInstance.post("/new-thread", payload);
    } catch (error) {
      await showUnauthorizedErrorToast();
      return [];
    }
  };

  return {
    addLink,
    createThread,
    getThreads,
  };
};
