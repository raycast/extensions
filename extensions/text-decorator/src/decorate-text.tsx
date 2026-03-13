import { fetchInputItem } from "./utils/input-item";
import {
  Clipboard,
  closeMainWindow,
  launchCommand,
  LaunchProps,
  LaunchType,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { decorate } from "./unicode-db/unicode-text-decorator";
import { DecoratorArguments } from "./types/types";
import { getArgument, isEmpty } from "./utils/common-utils";
import { fontFamily } from "./utils/constants";
import { actionAfterDecoration, fontFallback } from "./types/preferences";

export default async (props: LaunchProps<{ arguments: DecoratorArguments }>) => {
  const font_ = getArgument(props.arguments.font, `Font`);
  if (isEmpty(font_)) {
    await launchCommand({
      name: "decorate-text-with-font",
      type: LaunchType.UserInitiated,
    });
    await updateCommandMetadata({ subtitle: "With Font" });
  } else {
    await closeMainWindow();
    await decorateText(font_);
    await updateCommandMetadata({ subtitle: fontFamily.find((value) => value.value === font_)?.title });
  }
};

export const decorateText = async (textFont: string) => {
  const inputItem = await fetchInputItem();
  const decoratedText = decorate(inputItem, textFont, { fallback: fontFallback });
  if (actionAfterDecoration === "Paste") {
    await Clipboard.paste(decoratedText);
    await showHUD(`📋 ${decoratedText}`);
  } else {
    await Clipboard.copy(decoratedText);
    await showHUD(`📋 ${decoratedText}`);
  }
};
