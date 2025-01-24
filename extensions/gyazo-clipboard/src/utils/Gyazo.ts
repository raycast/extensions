import { getPreferenceValues } from "@raycast/api";
import { Gyazo, type UploadOptions } from "gyazo-api-ts";
import fetch from "node-fetch";

let gyazo: Gyazo;

export async function setupGyazo() {
  if (gyazo) {
    return gyazo;
  }
  const { "gyazo-api-key": apiKey } = getPreferenceValues<Preferences>();
  gyazo = new Gyazo(apiKey);
}

interface Param {
  fileBuffer: Buffer;
  fileName: string;
}

export async function uploadImageToGyazo({ fileBuffer, fileName }: Param) {
  const { error, success } = await gyazo.upload(fileBuffer, {
    contentType: ("image/" + fileName.split(".").pop()) as UploadOptions["contentType"],
    filename: fileName,
  });
  if (error) {
    return;
  }

  return success;
}

export async function fetchImageUrlFromGyazo(imageId: string) {
  const { error, success } = await gyazo.getImage(imageId);

  if (error) {
    console.error(error, imageId);
    return;
  }

  return success;
}

interface GyazoPublicAPIJSONResponse {
  accessible: boolean;
  image_id: string;
  alias_id: string;
  file_size: number;
  metadata_is_public: boolean;
  scale: {
    width: number;
    height: number;
    scale: number;
  };
  type: string;
  page_title: string;
  alt_text: string;
  deletable: null | boolean;
  owned: null | boolean;
  drawable: boolean;
  is_pro: boolean;
  access_policy: string;
  cross_origin: string;
  url: string;
  permalink_url: string;
  permalink_path: string;
  file_only: boolean;
  has_files: boolean;
  attached_files: Array<unknown>;
  thumb_url: string;
  poster_thumb_url: string;
  thumb1000: string;
  grid_thumbs: {
    large_url: string;
    large_url_2x: string;
    medium_url: string;
    medium_url_2x: string;
    small_url: string;
    small_url_2x: string;
    mobile_2x_url: string;
  };
  non_cropped_thumb: {
    url: string;
    scaled: {
      url: string;
      size: number;
      scale: number;
    };
  };
  explicit: boolean;
  categories: Array<unknown>;
  has_mp4: boolean;
  mp4_url: string;
  download_mp4_url: string;
  download_gif_url: string;
  video_length: number;
  is_preview_gif: boolean;
  has_audio: boolean;
  has_voice: boolean;
  has_webcam: boolean;
}

export async function getImageUrlFromGyazoLink(url: string) {
  const res = await fetch(`${url}.json`);
  const json = (await res.json()) as GyazoPublicAPIJSONResponse;

  return json;
}
