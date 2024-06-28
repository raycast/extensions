import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { PicsumConfig } from "./types/types";
import {
  blur,
  defaultHeight,
  defaultWidth,
  grayscale,
  jpg,
  noCache,
  PlaceholderArguments,
  staticRandom,
} from "./types/preferences";
import { getArguments, isEmpty } from "./utils/common-utils";
import { Picsum } from "picsum-photos/dist";

export default async (props: LaunchProps<{ arguments: PlaceholderArguments }>) => {
  const { args } = getArguments([props.arguments.width, props.arguments.height], ["Width", "Height"]);

  let width;
  let height;
  if (isEmpty(args[0]) && isEmpty(args[1])) {
    width = parseInt(defaultWidth);
    height = parseInt(defaultHeight);
  } else {
    width = parseInt(args[0]);
    height = parseInt(args[1]);
  }

  const picsumConfig: PicsumConfig = {
    width: width,
    height: height,
    blur: getBlur(blur),
    jpg: jpg,
    grayscale: grayscale,
    cache: noCache,
    staticRandom: staticRandom,
  };

  let _imageURL = Picsum.url(picsumConfig);
  if (picsumConfig.staticRandom) {
    _imageURL = _imageURL.replace("https://picsum.photos/", "https://picsum.photos/seed/" + Date.now() + "/");
  }

  await Clipboard.copy(_imageURL);
  await showHUD(`✨ ${_imageURL}`);
};

const getBlur = (blur: string): number => {
  let _blur = parseFloat(blur);
  if (isNaN(_blur) || _blur < 0) {
    _blur = 0;
  }
  if (_blur > 10) {
    _blur = 10;
  }
  return _blur;
};
