import { Result } from "@swan-io/boxed";
import axios from "axios";
import { ReadStream } from "fs";
import FormData from "form-data";
import { getPreferenceValues } from "@raycast/api";

const AGENT_NAME = "Raycast";

export type Link = {
  link: string;
  filename: string;
  host: string;
  size: number;
  date: number;
};

type AllDebridSaveResponse = {
  status: "success" | "error";
  data: {
    links: Link[];
  };
};

interface Preferences {
  apikey: string;
}

export const getSavedLinks = async () => {
  const { apikey } = getPreferenceValues<Preferences>();

  try {
    const { data } = await axios.get("https://api.alldebrid.com/v4/user/links", {
      params: {
        apikey: apikey,
        agent: AGENT_NAME,
      },
    });

    const data2 = data as AllDebridSaveResponse;

    if (data2.status === "error") {
      return Result.Error("");
    } else {
      return Result.Ok(data2.data.links);
    }
  } catch (e) {
    console.error(e);
    return Result.Error("");
  }
};

export type Magnet = {
  id: number;
  size: number;
  filename: string;
  status: "Downloading" | "Ready";
  links: Link[];
};

type AllDebridSavedMagnetsResponse = {
  status: "success" | "error";
  data: {
    magnets: Magnet[];
  };
};

export const getSavedMagnets = async () => {
  const { apikey } = getPreferenceValues<Preferences>();

  try {
    const { data } = await axios.get("https://api.alldebrid.com/v4/magnet/status", {
      params: {
        apikey: apikey,
        agent: AGENT_NAME,
      },
    });

    const data2 = data as AllDebridSavedMagnetsResponse;

    if (data2.status === "error") {
      return Result.Error("");
    } else {
      return Result.Ok(data2.data.magnets);
    }
  } catch (e) {
    console.error(e);
    return Result.Error("");
  }
};

type DeletionResponse = {
  status: "success" | "error";
};

export const deleteSavedLink = async (link: string) => {
  const { apikey } = getPreferenceValues<Preferences>();

  try {
    const { data } = await axios.get("https://api.alldebrid.com/v4/user/links/delete", {
      params: {
        apikey: apikey,
        agent: AGENT_NAME,
        link: link,
      },
    });

    const { status } = data as DeletionResponse;

    if (status === "error") {
      return Result.Error("");
    } else {
      return Result.Ok;
    }
  } catch (e) {
    console.error(e);
    return Result.Error("");
  }
};

export const deleteSavedMagnet = async (magnetId: string) => {
  const { apikey } = getPreferenceValues<Preferences>();

  try {
    const { data } = await axios.get("https://api.alldebrid.com/v4/magnet/delete", {
      params: {
        apikey: apikey,
        agent: AGENT_NAME,
        id: magnetId,
      },
    });

    const { status } = data as DeletionResponse;

    if (status === "error") {
      return Result.Error("");
    } else {
      return Result.Ok;
    }
  } catch (e) {
    console.error(e);
    return Result.Error("");
  }
};

type AllDebridFileUpload = {
  name: string;
  error?: {
    code: string;
    message: string;
  };
};
type AllDebridUnlockResponse = {
  status: "success" | "error";
  data: {
    files: AllDebridFileUpload[];
  };
};

export type UploadMagnetParams = {
  files: ReadStream[];
};

export const uploadMagnet = (values: UploadMagnetParams): Promise<AllDebridUnlockResponse> => {
  const { apikey } = getPreferenceValues<Preferences>();
  const formData = new FormData();

  values.files.forEach((file) => {
    formData.append("files[]", file);
  });

  return axios
    .post("https://api.alldebrid.com/v4/magnet/upload/file", formData, {
      params: {
        apikey: apikey,
        agent: AGENT_NAME,
      },
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then(({ data }) => data);
};

type AllDebridUnlockUrlResponse = {
  status: "success" | "error";
  data: {
    link: string;
  };
};

export const debridUrl = (link: string): Promise<Result<string, string>> => {
  const { apikey } = getPreferenceValues<Preferences>();

  return axios
    .get("https://api.alldebrid.com/v4/link/unlock", {
      params: {
        apikey: apikey,
        link: link,
        agent: AGENT_NAME,
      },
    })
    .then(({ data }) => {
      const {
        status,
        data: { link },
      } = data as AllDebridUnlockUrlResponse;

      if (status === "error") {
        return Result.Error("");
      } else {
        return Result.Ok(link);
      }
    });
};

type AllDebridSaveLinkResponse = {
  status: "success" | "error";
  data: {
    message: string;
  };
};

export const saveLink = (link: string): Promise<AllDebridSaveLinkResponse> => {
  const { apikey } = getPreferenceValues<Preferences>();

  return axios
    .get("https://api.alldebrid.com/v4/user/links/save", {
      params: {
        apikey: apikey,
        links: [link],
        agent: AGENT_NAME,
      },
    })
    .then(({ data }) => data);
};
