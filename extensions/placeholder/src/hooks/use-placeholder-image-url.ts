import { Picsum } from "picsum-photos/dist";
import { useMemo } from "react";
import type { SpecifyIdImageConfig } from "@/types/types";

const useSpecifyIdPlaceholderImageURL = (picsumConfig: SpecifyIdImageConfig) => {
  const imageURL = useMemo(() => {
    let _blur = parseFloat(picsumConfig.blur);
    if (isNaN(_blur) || _blur < 0) {
      _blur = 0;
    }
    if (_blur > 10) {
      _blur = 10;
    }
    let _imageURL = Picsum.url({
      id: parseInt(picsumConfig.id),
      width: parseInt(picsumConfig.width),
      height: parseInt(picsumConfig.height),
      blur: _blur,
      cache: picsumConfig.cache,
      grayscale: picsumConfig.grayscale,
      jpg: picsumConfig.jpg,
    });
    if (parseInt(picsumConfig.id) === 0) {
      _imageURL = _imageURL.replace("https://picsum.photos/", `https://picsum.photos/id/${0}/`);
    }
    return _imageURL;
  }, [picsumConfig]);

  return { imageURL };
};

export default useSpecifyIdPlaceholderImageURL;
