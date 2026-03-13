import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { resend } from "./resend";

const showSuccessToast = async (items: unknown[], singular: string, plural = `${singular}s`) => {
  const numOfItems = items.length;
  await showToast(Toast.Style.Success, "Success", `Fetched ${numOfItems} ${numOfItems === 1 ? singular : plural}`);
};
export const onError = async (error: Error) => {
  await showFailureToast(error, { title: String(error.cause ?? "Something went wrong") });
};
export const useGetDomains = () => {
  const { data, ...rest } = useCachedPromise(
    async () => {
      await showToast(Toast.Style.Animated, "Processing...", "Fetching Domains");
      const res = await resend.domains.list();
      if (res.error) throw new Error(res.error.message, { cause: res.error.name });
      const data = res.data.data;
      await showSuccessToast(data, "domain");
      return data;
    },
    [],
    {
      initialData: [],
      onError,
    },
  );

  return { domains: data, ...rest };
};

export const useGetAPIKeys = () => {
  const { data, ...rest } = useCachedPromise(
    async () => {
      await showToast(Toast.Style.Animated, "Processing...", "Fetching API Keys");
      const res = await resend.apiKeys.list();
      if (res.error) throw new Error(res.error.message, { cause: res.error.name });
      const data = res.data.data;
      await showSuccessToast(data, "api key");
      return data;
    },
    [],
    {
      initialData: [],
      onError,
    },
  );
  return { keys: data, ...rest };
};

export const useEmails = () => {
  const { data, ...rest } = useCachedPromise(
    () => async (options) => {
      await showToast(Toast.Style.Animated, "Processing...", "Fetching Emails");
      const res = await resend.emails.list({ after: options.lastItem?.id });
      if (res.error) throw new Error(res.error.message, { cause: res.error.name });
      const data = res.data.data;
      await showSuccessToast(data, "email");
      return {
        data,
        hasMore: res.data.has_more,
      };
    },
    [],
    {
      initialData: [],
      onError,
    },
  );
  return { emails: data, ...rest };
};
export const useGetEmail = (id: string) => {
  const { data, ...rest } = useCachedPromise(
    async (id: string) => {
      await showToast(Toast.Style.Animated, "Processing...", "Fetching Emails");
      const res = await resend.emails.get(id);
      if (res.error) throw new Error(res.error.message, { cause: res.error.name });
      const data = res.data;
      await showSuccessToast([data], "email");
      return data;
    },
    [id],
    {
      onError,
    },
  );
  return { email: data, ...rest };
};

export const useAudiences = () => {
  const { data, ...rest } = useCachedPromise(
    async () => {
      await showToast(Toast.Style.Animated, "Processing...", "Fetching Audiences");
      const res = await resend.audiences.list();
      if (res.error) throw new Error(res.error.message, { cause: res.error.name });
      const data = res.data.data;
      await showSuccessToast(data, "audience");
      return data;
    },
    [],
    {
      initialData: [],
      onError,
    },
  );
  return { audiences: data, ...rest };
};
export const useContacts = (audienceId?: string) => {
  const { data, ...rest } = useCachedPromise(
    async (audienceId?: string) => {
      if (!audienceId) return [];
      await showToast(Toast.Style.Animated, "Processing...", "Fetching Contacts");
      const res = await resend.contacts.list({ audienceId });
      if (res.error) throw new Error(res.error.message, { cause: res.error.name });
      const data = res.data.data;
      await showSuccessToast(data, "contact");
      return data;
    },
    [audienceId],
    {
      initialData: [],
      onError,
    },
  );
  return { contacts: data, ...rest };
};
