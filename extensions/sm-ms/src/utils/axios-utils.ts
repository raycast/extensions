import axios from "axios";
import { SM_MS_BASE_URL } from "./costants";
import { ImageData, SMMSResponse } from "../types/types";
import { showHUD, showToast, Toast } from "@raycast/api";
import { copyLinkWithForm, isEmpty, isUrl, titleCase } from "./common-utils";
import { secretToken } from "../hooks/hooks";
import fse from "fs-extra";
import { Dispatch, SetStateAction } from "react";
import FormData = require("form-data");
import Style = Toast.Style;

export const deleteImageByHash = async (hash: string) => {
  return await axios({
    method: "GET",
    url: SM_MS_BASE_URL + "/delete/" + hash,
    headers: {
      Authorization: secretToken,
    },
  })
    .then((axiosResponse) => {
      const smmsResponse = axiosResponse.data as SMMSResponse;
      if (smmsResponse.success) {
        showToast(Style.Success, titleCase(smmsResponse.code), smmsResponse.message);
      } else {
        showToast(Style.Failure, titleCase(smmsResponse.code), smmsResponse.message);
      }
      return { success: smmsResponse.success, code: titleCase(smmsResponse.code), message: smmsResponse.message };
    })
    .catch((reason) => {
      return { success: false, code: "Error!", message: String(reason) };
    });
};

export const uploadImage = async (
  imagePath: string,
  setImagePathError: Dispatch<SetStateAction<string | undefined>>,
) => {
  const formData = new FormData();
  let imageStream;
  if (isEmpty(imagePath)) {
    setImagePathError("Please select an image file!");
    return;
  }
  if (!fse.existsSync(imagePath) && !isUrl(imagePath)) {
    setImagePathError("Please input an valid image url!");
    return;
  }

  await showToast(Style.Animated, "Uploading image...");
  if (fse.existsSync(imagePath)) {
    //Path
    imageStream = fse.createReadStream(imagePath);
  } else if (isUrl(imagePath)) {
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
        copyLinkWithForm(imageData.url);
        return { success: smmsResponse.success, code: smmsResponse.code, message: imageData.url };
      } else {
        showToast(Style.Failure, titleCase(smmsResponse.code), smmsResponse.message);
        return { success: smmsResponse.success, code: smmsResponse.code, message: smmsResponse.message };
      }
    })
    .catch((reason) => {
      showToast(Style.Failure, String(reason));
      return { success: false, code: "Error!", message: String(reason) };
    });
};

export const uploadImageFromClipboard = async (imagePath: string) => {
  const formData = new FormData();
  let imageStream;
  if (isEmpty(imagePath)) {
    console.error("Please select an image file!");
    return;
  }
  if (!fse.existsSync(imagePath) && !isUrl(imagePath)) {
    console.error("Please input an valid image url!");
    return;
  }

  await showHUD("Uploading image...");
  if (fse.existsSync(imagePath)) {
    imageStream = fse.createReadStream(imagePath);
  } else if (isUrl(imagePath)) {
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
        showHUD("URL is copied to clipboard.");
        const imageData = smmsResponse.data as ImageData;
        copyLinkWithForm(imageData.url);
        return { success: smmsResponse.success, code: smmsResponse.code, message: imageData.url };
      } else {
        showHUD(smmsResponse.message);
        return { success: smmsResponse.success, code: smmsResponse.code, message: smmsResponse.message };
      }
    })
    .catch((reason) => {
      showHUD(String(reason));
      return { success: false, code: "Error!", message: String(reason) };
    });
};

export const axiosGetImageArrayBuffer = async (url: string) => {
  const res = await axios({
    url: url,
    method: "GET",
    responseType: "arraybuffer",
  });
  return res.data;
};
