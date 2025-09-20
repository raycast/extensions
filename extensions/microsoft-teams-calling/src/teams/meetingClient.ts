import { ErrorEvent } from "ws";
import { prefs } from "./preferences";
import { MeetingClientV1 } from "./meetingClientV1";
import { MeetingClientV2 } from "./meetingClientV2";

export interface MeetingPermissions {
  canToggleMute: boolean;
  canToggleVideo: boolean;
  canToggleHand: boolean;
  canToggleBlur: boolean;
  canToggleRecord: boolean;
  canLeave: boolean;
  canReact: boolean;
  canToggleShareTray: boolean;
  canToggleChat: boolean;
  canStopSharing: boolean;
  canPair?: boolean; //only available in V2
}

export type MeetingPermission = keyof MeetingPermissions;

export interface MeetingState {
  isMuted: boolean;
  isCameraOn: boolean;
  isHandRaised: boolean;
  isInMeeting: boolean;
  isRecordingOn: boolean;
  isBackgroundBlurred: boolean;
}

export interface UpdateMessage {
  apiVersion: string;
  meetingUpdate: {
    meetingState?: MeetingState;
    meetingPermissions: MeetingPermissions;
  };
}

export type SingleMeetingState = keyof MeetingState;

export type ToggleMuteAction = "toggle-mute";
export type ToggleVideoAction = "toggle-video";
export type ToggleBackgroundBlurAction = "toggle-background-blur";
export type ToggleRecordingAction = "toggle-recording";
export type ToggleHandAction = "toggle-hand";
export type CallAction = "leave-call";
export type ReactAction = "react-applause" | "react-laugh" | "react-like" | "react-love" | "react-wow";
export type QueryMeetingStateAction = "query-meeting-state";

export type MeetingAction =
  | ToggleMuteAction
  | ToggleVideoAction
  | ToggleBackgroundBlurAction
  | ToggleRecordingAction
  | ToggleHandAction
  | CallAction
  | ReactAction
  | QueryMeetingStateAction;

export class Deferred<T> {
  readonly promise: Promise<T>;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resolve: (result: T) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  reject: (reason?: any) => void = () => {};

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export interface MeetingClientProps {
  onConnected?: (msg?: UpdateMessage) => void;
  onMessage?: (msg: UpdateMessage) => void;
  onError?: (event: ErrorEvent) => void;
  onClose?: () => void;
}

export interface MeetingClient {
  sendAction(action: MeetingAction): void;
  sendActionAndRequestMeetingState(action: MeetingAction): Promise<UpdateMessage>;
  requestMeetingState(): Promise<UpdateMessage>;
  close(): void;
}

export function meetingClientFromPrefs(props: MeetingClientProps): MeetingClient {
  if (prefs.apiVersion && prefs.apiVersion == "new") {
    return new MeetingClientV2(props);
  } else {
    return new MeetingClientV1(props);
  }
}

export async function asyncMeetingClient(onError?: (event: ErrorEvent) => void): Promise<MeetingClient> {
  const deferred = new Deferred<MeetingClient>();
  const client: MeetingClient = meetingClientFromPrefs({
    onConnected: () => deferred.resolve(client),
    onError,
  });
  return deferred.promise;
}
