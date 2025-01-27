import { Color } from "@raycast/api";
import { Renderer } from "../types/renderer";
import { imageRenderer } from "./renderers/image";
import { jsonRenderer } from "./renderers/json";
import { isJson } from "./storage";

export const getStatusColor = (status: number) => {
  if (status >= 100 && status < 200) {
    return Color.SecondaryText;
  }

  if (status >= 200 && status < 300) {
    return Color.Green;
  }

  if (status >= 300 && status < 400) {
    return Color.Yellow;
  }

  return Color.Red;
};

export const getRenderer: (contentType: string) => Renderer = (contentType: string) => {
  if (contentType.startsWith("application/json")) {
    return jsonRenderer;
  }

  if (contentType.startsWith("image/")) {
    return imageRenderer;
  }

  return (request, response) => {
    if (isJson(response.body)) {
      return jsonRenderer(request, response);
    }

    return response.body;
  };
};
