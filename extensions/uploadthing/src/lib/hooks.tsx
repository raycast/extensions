import "./web-polyfill";

import { Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { UTApi, UTFile } from "uploadthing/server";
import { UploadedFileData } from "uploadthing/types";
import {
  getACLInfoForApp,
  getSignedUrls,
  getToken,
  readFilesFromClipboard,
} from "./utils";
import { ACL } from "@uploadthing/shared";
import { useCachedPromise } from "@raycast/utils";

export const useUpload = () => {
  const toast = useRef<Toast | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);

  const mutation = useMutation({
    mutationFn: async (opts: { files: UTFile[]; acl: ACL | undefined }) => {
      const { files, acl } = opts;
      const utapi = new UTApi({ token: getToken() });
      return await utapi.uploadFiles(files, { acl });
    },
    onMutate: async () => {
      toast.current = await showToast({
        title: "Uploading files",
        message: "Uploading files to UploadThing",
        style: Toast.Style.Animated,
      });
    },
    onSuccess: (data) => {
      console.log(data);
      toast.current!.style = Toast.Style.Success;
      toast.current!.title = "Files uploaded";

      setUploadedFiles(
        data.filter((file) => !!file.data).map((file) => file.data!),
      );
    },
    onError: (err) => {
      console.error(err);
      toast.current!.style = Toast.Style.Failure;
      toast.current!.title = "Failed to upload files";
      toast.current!.message = err.message;
      toast.current!.primaryAction = {
        title: "Open Extension Preferences",
        onAction: (toast) => {
          openExtensionPreferences();
          toast.hide();
        },
      };
    },
  });

  return {
    upload: mutation.mutate,
    uploading: mutation.isPending,
    uploadedFiles,
  };
};

export const useClipboardFiles = () => {
  const query = useQuery({
    queryKey: ["clipboard"],
    queryFn: readFilesFromClipboard,
  });

  return { files: query.data, readingClipboard: query.isPending };
};

export const useFileWithSignedUrls = (
  files: { key: string; url: string }[],
) => {
  const query = useQuery({
    queryKey: ["signed-urls"],
    queryFn: () => getSignedUrls(files),
  });

  return files.map((file, idx) => {
    const url = query.data?.[idx] ?? file.url;
    return { ...file, url };
  });
};

export const useAppInfo = () => {
  const query = useQuery({
    queryKey: ["app-info"],
    queryFn: getACLInfoForApp,
  });

  return query.data;
};

export const useFiles = () => {
  const utapi = new UTApi({ token: getToken() });
  const LIMIT = 20;
  const { isLoading, data, pagination } = useCachedPromise(
    () => async (options: { page: number }) => {
      const res = await utapi.listFiles({
        offset: options.page * LIMIT,
        limit: LIMIT,
      });

      return {
        data: [...res.files],
        hasMore: res.hasMore,
      };
    },
    [],
    { initialData: [] },
  );
  return { isLoading, files: data, pagination };
};
