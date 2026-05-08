import type { TweakDefinition } from "../types";
import { finderTweaks } from "./finder";
import { dockTweaks } from "./dock";
import { screenshotsTweaks } from "./screenshots";
import { desktopTweaks } from "./desktop";
import { animationsTweaks } from "./animations";
import { keyboardTweaks } from "./keyboard";
import { trackpadTweaks } from "./trackpad";
import { safariTweaks } from "./safari";
import { mailTweaks } from "./mail";
import { securityTweaks } from "./security";
import { menubarTweaks } from "./menubar";
import { appsTweaks } from "./apps";
import { miscTweaks } from "./misc";

export const ALL_TWEAKS: TweakDefinition[] = [
  ...finderTweaks,
  ...dockTweaks,
  ...screenshotsTweaks,
  ...desktopTweaks,
  ...animationsTweaks,
  ...keyboardTweaks,
  ...trackpadTweaks,
  ...safariTweaks,
  ...mailTweaks,
  ...securityTweaks,
  ...menubarTweaks,
  ...appsTweaks,
  ...miscTweaks,
];
