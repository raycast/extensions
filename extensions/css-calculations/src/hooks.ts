import { useState } from "react";

export function useErrors() {
  const [minFontSizeError, setMinFontSizeError] = useState<string | undefined>();
  const [maxFontSizeError, setMaxFontSizeError] = useState<string | undefined>();
  const [minViewportWidthError, setMinViewportWidthError] = useState<string | undefined>();
  const [maxViewportWidthError, setMaxViewportWidthError] = useState<string | undefined>();
  const [pxPerRemError, setPxPerRemError] = useState<string | undefined>();

  function setErrorByKey(key: string, value: string) {
    switch (key) {
      case "min_font_size":
        setMinFontSizeError(value);
        break;
      case "max_font_size":
        setMaxFontSizeError(value);
        break;
      case "min_viewport_width":
        setMaxViewportWidthError(value);
        break;
      case "max_viewport_width":
        setMaxViewportWidthError(value);
        break;
      case "px_per_rem":
        setPxPerRemError(value);
        break;
    }
  }

  return {
    minFontSizeError,
    setMinFontSizeError,
    maxFontSizeError,
    setMaxFontSizeError,
    minViewportWidthError,
    setMinViewportWidthError,
    maxViewportWidthError,
    setMaxViewportWidthError,
    pxPerRemError,
    setPxPerRemError,
    setErrorByKey,
  };
}
