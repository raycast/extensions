import { useCallback, useEffect, useState } from "react";
import { avatarInit, AvatarOptions } from "../types/types";
import { AVATAR_URL, MULTI_AVATAR_URL } from "../utils/constants";

export const createAvatarURL = (avatarOptions: AvatarOptions) => {
  const [avatarURL, setAvatarURL] = useState<{ png: string; svg: string }>({ png: "", svg: "" });
  const [multiAvatarURL, setMultiAvatarURL] = useState<{ png: string; svg: string }>({ png: "", svg: "" });

  const fetchData = useCallback(async () => {
    const options = () => {
      const backgroundColor =
        avatarOptions.backgroundColor === avatarInit.backgroundColor
          ? ""
          : `b=${avatarOptions.backgroundColor.replace("#", "%23")}&`;
      const radius = avatarOptions.radius === avatarInit.radius ? "" : `r=${avatarOptions.radius}&`;
      const scale = avatarOptions.scale === avatarInit.scale ? "" : `scale=${avatarOptions.scale}&`;
      const rotate = avatarOptions.rotate === avatarInit.rotate ? "" : `rotate=${avatarOptions.rotate}&`;
      const translateX =
        avatarOptions.translateX === avatarInit.translateX ? "" : `translateX=${avatarOptions.translateX}&`;
      const translateY =
        avatarOptions.translateY === avatarInit.translateY ? "" : `translateY=${avatarOptions.translateY}&`;
      const flip = avatarOptions.flip === avatarInit.flip ? "" : `flip=${avatarOptions.flip}`;

      const tempOptions = "?" + backgroundColor + radius + scale + rotate + translateX + translateY + flip;
      return tempOptions.length === 1 ? "" : tempOptions;
    };
    const pngURL = AVATAR_URL + "/" + avatarOptions.style + "/" + avatarOptions.seed + ".png" + options();
    const svgURL = AVATAR_URL + "/" + avatarOptions.style + "/" + avatarOptions.seed + ".svg" + options();
    const multiSVGURL = MULTI_AVATAR_URL + "/" + avatarOptions.seed + ".svg";
    const multiPNGURL = MULTI_AVATAR_URL + "/" + avatarOptions.seed + ".png";
    setAvatarURL({ png: pngURL, svg: svgURL });
    setMultiAvatarURL({ png: multiPNGURL, svg: multiSVGURL });
  }, [avatarOptions]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { avatarURL: avatarURL, multiAvatarURL: multiAvatarURL };
};
