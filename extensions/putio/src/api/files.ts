import type { IFile } from "@putdotio/api-client";
import { getPutioClient } from "./withPutioClient";

export const fetchFiles = async (id: number) => {
  const response = await getPutioClient().Files.Query(id, {
    mp4Status: true,
  });

  return {
    parent: response.data.parent,
    files: response.data.files,
  } as {
    parent: IFile;
    files: IFile[];
  };
};

export const searchFiles = async (keyword: string) => {
  const response = await getPutioClient().Files.Search(keyword);
  return response.data;
};

export const renameFile = async (id: number, name: string) => {
  const response = await getPutioClient().File.Rename(id, name);
  return response.data;
};

export const deleteFile = async (id: number) => {
  const response = await getPutioClient().Files.Delete([id]);
  return response.data;
};
