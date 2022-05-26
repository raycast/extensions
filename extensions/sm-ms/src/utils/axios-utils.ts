import axios from "axios";
import { SM_MS_BASE_URL } from "./costants";
import { ImageData, SMMSResponse } from "../types/types";
import { Clipboard, showToast, Toast } from "@raycast/api";
import { isEmpty, titleCase } from "./common-utils";
import * as fs from "fs";
import { secretToken } from "../hooks/hooks";
import FormData = require("form-data");
import Style = Toast.Style;

export const deleteImageByHash = async (hash: string) => {
  return await axios({
    method: "GET",
    url: SM_MS_BASE_URL + "/delete/" + hash,
    headers: {},
  })
    .then((axiosResponse) => {
      const smmsResponse = axiosResponse.data as SMMSResponse;
      showToast(Style.Success, titleCase(smmsResponse.code), smmsResponse.message);
      return { success: smmsResponse.success, code: titleCase(smmsResponse.code), message: smmsResponse.message };
    })
    .catch((reason) => {
      return { success: false, code: "Error!", message: String(reason) };
    });
};

export const uploadImage = async (imagePath: string) => {
  await showToast(Style.Animated, "Uploading image...");
  const formData = new FormData();
  let imageStream;
  if (isEmpty(imagePath)) {
    showToast(Style.Failure, "Image path cannot be empty!");
  }
  if (fs.existsSync(imagePath)) {
    //Path
    imageStream = fs.createReadStream(imagePath);
  } else {
    //URL
    imageStream = (await axios.get(imagePath, { responseType: "stream" })).data;
  }
  formData.append("smfile", imageStream);

  const config = {
    headers: {
      Authorization: secretToken,
      "Content-Type": "multipart/form-data",
    },
  };
  return await axios
    .post(SM_MS_BASE_URL + "/upload", formData, config)
    .then((axiosResponse) => {
      const smmsResponse = axiosResponse.data as SMMSResponse;
      if (smmsResponse.success) {
        showToast(Style.Success, titleCase(smmsResponse.code), "URL is copied to clipboard.");
        const imageData = smmsResponse.data as ImageData;
        Clipboard.copy(imageData.url);
      } else {
        showToast(Style.Success, titleCase(smmsResponse.code), smmsResponse.message);
      }
      return smmsResponse;
    })
    .catch((reason) => {
      showToast(Style.Failure, String(reason));
    });
};
