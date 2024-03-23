import React from "react";
import { showToast, Toast } from "@raycast/api";

type pendingParams = {
  style?: Toast.Style;
  title?: string | null;
  message?: string;
};

let singletonToast: Toast | null = null;

const emptyToast: pendingParams = { title: null };

const setSingletonToast = (params: pendingParams) => {
  if (!singletonToast) return;

  const { title, message, style } = params;

  if (style && title) {
    singletonToast.style = style;
    singletonToast.title = title;
    singletonToast.message = message;
    singletonToast.show();
  } else {
    singletonToast.hide();
  }
};

export const useToast = (style: Toast.Style, title?: string | null, message?: string) => {
  const pendingParams = React.useRef<pendingParams>(emptyToast);

  React.useEffect(() => {
    if (singletonToast) {
      setSingletonToast({ style, title, message });
    } else if (title) {
      if (pendingParams.current !== emptyToast) {
        pendingParams.current = { style, title, message };
        return;
      }

      pendingParams.current = { style, title, message };

      showToast({
        style,
        title,
        message,
      }).then((instance) => {
        singletonToast = instance;
        setSingletonToast(pendingParams.current);
      });
    } else {
      pendingParams.current = emptyToast;
    }
  }, [style, title, message, pendingParams]);
};

export const useErrorToast = (title?: string | null, message?: string) => useToast(Toast.Style.Failure, title, message);

export const useLoadingToast = (title?: string | null, message?: string) =>
  useToast(Toast.Style.Animated, title, message);
