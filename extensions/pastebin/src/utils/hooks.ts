import client from "./client";
import useSWR from "swr";
import { getPreferenceValues, Toast } from "@raycast/api";

const preferences = getPreferenceValues();

export function useToken() {
  const { data } = useSWR("/login", async () => {
    return client.login({ name: preferences.username, password: preferences.password });
  });

  return data;
}

export function usePastes() {
  const token = useToken();
  const { data, error, mutate } = useSWR(token ? ["/pastes", token] : null, async (url, token) => {
    return client.getPastesByUser({ userKey: token });
  });

  const pastes = (data ?? []).sort((a, b) => b.paste_date - a.paste_date);

  async function removePasting(id: string) {
    const toast = new Toast({
      title: "Deleting paste",
      style: Toast.Style.Animated,
    });

    toast.show();

    if (!token) {
      toast.title = "User not logged in";
      toast.style = Toast.Style.Failure;
      return;
    }

    try {
      const deleted = await client.deletePasteByKey({ pasteKey: id, userKey: token });
      if (!deleted) {
        toast.title = "Something went wrong";
        toast.style = Toast.Style.Failure;
        return;
      }

      mutate();

      toast.title = "Paste deleted";
      toast.style = Toast.Style.Success;
    } catch {
      toast.title = "Something went wrong";
      toast.style = Toast.Style.Failure;
    }
  }

  return {
    pastes,
    loading: !data && !error,
    removePasting,
  };
}

export function usePaste(id?: string) {
  const token = useToken();
  const { data: paste, error } = useSWR(token && id ? [`/pastes`, id, token] : null, async (url, id, token) => {
    return client.getRawPasteByKey({ pasteKey: id, userKey: token });
  });

  return {
    paste: paste ?? "",
    loading: !paste && !error,
  };
}
