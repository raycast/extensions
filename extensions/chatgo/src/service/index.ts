import axios from "axios";
import { ChatParams, GetImagesOps } from "../type";

export const HOST = "http://www.chatgo.pro";

axios.defaults.baseURL = HOST;

export const loginAccount = (ops: { email: string; password: string }) => {
  return axios.post("/api/signIn", {
    ...ops,
  });
};

export const getAccountBalance = (token: string) => {
  return axios.get(`/api/account/balance`, {
    headers: {
      Authorization: token,
    },
  });
};

export const getMyTemplateListService = (token: string) => {
  return axios.get(`/api/prompt/myTemplate/list`, {
    headers: {
      Authorization: token,
    },
  });
};

export const chat = (ops: ChatParams) => {
  const { token, data, onClose, onMessage, onError } = ops;
  axios({
    method: "post",
    url: "/api/chat",
    responseType: "stream",
    headers: {
      Authorization: token,
    },
    data: {
      model: "gpt-3.5-turbo",
      clientType: 4,
      ...data,
    },
  })
    .then((response) => {
      response.data.on("data", (chunk: any) => {
        const buffer = Buffer.from(chunk, "binary");
        const lines = buffer
          .toString()
          .split("\n")
          .filter((line: string) => line.trim() !== "");

        for (const line of lines) {
          const message = line.replace(/^data: /, "");
          if (message === "[DONE]") {
            onClose();
            return;
          }
          try {
            const jsonData: any = JSON.parse(message);
            onMessage(jsonData);
          } catch (error) {
            // toast.title = "Error";
            // toast.message = `Couldn't stream message`;
            // toast.style = Toast.Style.Failure;
            // setLoading(false);
          }
        }
      });
      response.data.on("end", () => {
        console.log("stream end");
      });
    })
    .catch((err) => {
      onError(err);
      console.error(err);
    });
};

export const getImagesService = (ops: GetImagesOps, token: string) => {
  const { n = 2, size = "512x512", prompt } = ops;
  return axios({
    method: "post",
    url: `/api/image/create`,
    headers: {
      Authorization: token,
    },
    data: {
      n,
      size,
      prompt,
    },
  });
};

export const getPromptTemplatesService = async (ops: { name?: string; tag?: string }, token: string) => {
  const { tag = "", name = "" } = ops;

  return axios({
    method: "get",
    url: `/api/prompt/templates`,
    headers: {
      Authorization: token,
    },
    params: ops,
  });
};

export const getFavoriteListService = async (ops: { name?: string }, token: string) => {
  return axios({
    method: "get",
    url: "/api/favorite/list",
    headers: {
      Authorization: token,
    },
    params: ops,
  });
};

export const addMyTemplateService = async (templateId: number, token: string) => {
  return axios({
    method: "post",
    url: `/api/prompt/myTemplate/add`,
    headers: {
      Authorization: token,
    },
    data: {
      templateId,
    },
  });
};

export const removeMyTemplateService = async (id: number, token: string) => {
  return axios({
    method: "post",
    url: `/api/prompt/myTemplate/remove`,
    headers: {
      Authorization: token,
    },
    data: {
      id,
    },
  });
};
