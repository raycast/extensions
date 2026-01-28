import { useCallback, useEffect, useState } from "react";
import { AvatarInfo, avatarInfoInit, avatarInit, AvatarOptions } from "../types/types";
import { AVATAR_URL, MULTI_AVATAR_URL } from "../utils/constants";
import multiavatar from "@multiavatar/multiavatar";

export const createAvatarURL = (avatarOptions: AvatarOptions) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [diceBearAvatarInfo, setDiceBearAvatarInfo] = useState<AvatarInfo>(avatarInfoInit);
  const [multiAvatarInfo, setMultiAvatarInfo] = useState<AvatarInfo>(avatarInfoInit);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const _options = options(avatarOptions);
    const encodeSeed = encodeURI(avatarOptions.seed);
    const pngURL = AVATAR_URL + avatarOptions.style + "/png?seed=" + encodeSeed + _options;
    const svgURL = AVATAR_URL + avatarOptions.style + "/svg?seed=" + encodeSeed + _options;
    const multiSVGURL = MULTI_AVATAR_URL + "/" + avatarOptions.seed + ".svg";
    const multiPNGURL = MULTI_AVATAR_URL + "/" + avatarOptions.seed + ".png";
    const multiavatarSVGCode = multiavatar(avatarOptions.seed);
    const markdownImage = `<img src="data:image/svg+xml;base64,${Buffer.from(multiavatarSVGCode, "utf-8").toString(
      "base64",
    )}" height="190" alt="${avatarOptions.seed}" />`;
    setDiceBearAvatarInfo({ svgCode: "", markdownImage: "", png: pngURL, svg: svgURL });
    setMultiAvatarInfo({
      svgCode: multiavatarSVGCode,
      markdownImage: markdownImage,
      png: multiPNGURL,
      svg: multiSVGURL,
    });
    setLoading(false);
  }, [avatarOptions]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { diceBearAvatarInfo: diceBearAvatarInfo, multiAvatarInfo: multiAvatarInfo, loading: loading };
};

export const options = (avatarOptions: AvatarOptions) => {
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

  const tempOptions = "&" + backgroundColor + radius + scale + rotate + translateX + translateY + flip;
  return tempOptions.length === 1 ? "" : tempOptions;
};
