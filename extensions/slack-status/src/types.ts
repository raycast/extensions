import { MutatePromise } from "@raycast/utils";
import { Profile } from "@slack/web-api/dist/response/UsersProfileGetResponse";
import { DndInfoResponse } from "@slack/web-api/dist/response/DndInfoResponse";

export type SlackStatus = {
  emojiCode: string;
  title: string;
  expiration?: number; // timestamp in milliseconds
};

export type SlackStatusPreset = {
  id?: string;
  emojiCode: string;
  title: string;
  defaultDuration: number; // 0 means "don't clear"
  pauseNotifications: boolean;
};

export type FormValues = {
  emoji: string;
  statusText: string;
  duration: string;
  pauseNotifications: boolean;
};

export type SlackMutatePromise = MutatePromise<
  { profile: Profile | undefined; dnd: DndInfoResponse | undefined },
  undefined
>;

export interface CommandLinkParams {
  presetId: string;
}
