import { Picsum } from "picsum-photos/dist";
import type { LaunchProps } from "@raycast/api";
import { Clipboard, showHUD } from "@raycast/api";
import type { PicsumConfig } from "@/types/types";
import { getArguments, isEmpty } from "@/utils/common-utils";
import { getBlur } from "@/utils/parse";
import { blur, defaultHeight, defaultWidth, grayscale, jpg, noCache, staticRandom } from "@/utils/preferences";

interface PlaceholderArguments {
  height: string;
  width: string;
}

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
