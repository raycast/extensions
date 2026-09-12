import { APP_TYPE, AVATAR_TYPE } from "@/constants";
import type { ValueOf } from "type-fest";

export type AppType = ValueOf<typeof APP_TYPE>;

export type AvatarType = ValueOf<typeof AVATAR_TYPE>;
