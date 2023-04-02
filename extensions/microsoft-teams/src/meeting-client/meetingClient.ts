import { WebSocket, ErrorEvent, MessageEvent } from "ws";
import { prefs } from "../preferences";

const host = "127.0.0.1";
const port = 8124;
const apiVersion = "1.0.0";
const manufacturer = "Sven Wiegand";
const device = "Raycast";
const app = "Raycast";
const appVersion = "1.0.0";

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

export type SingleMeetingState = keyof MeetingState;

export interface UpdateMessage {
  apiVersion: string;
  meetingUpdate: {
    meetingState: MeetingState;
    meetingPermissions: MeetingPermissions;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUpdateMessage(msg: any): msg is UpdateMessage {
  return "meetingUpdate" in msg;
}

type ToggleMuteAction = "toggle-mute";
type ToggleVideoAction = "toggle-video";
type ToggleBackgroundBlurAction = "toggle-background-blur";
type ToggleRecordingAction = "toggle-recording";
type ToggleHandAction = "toggle-hand";
type CallAction = "leave-call" | "react-applause" | "react-laugh" | "react-like" | "react-love" | "react-wow";
type QueryMeetingStateAction = "query-meeting-state";
export type MeetingAction =
  | ToggleMuteAction
  | ToggleVideoAction
  | ToggleBackgroundBlurAction
  | ToggleRecordingAction
  | ToggleHandAction
  | CallAction
  | QueryMeetingStateAction;

interface ControlMessage {
  apiVersion: string;
  manufacturer: string;
  device: string;
  timestamp: number;
  service:
    | "toggle-mute"
    | "toggle-video"
    | "background-blur"
    | "recording"
    | "raise-hand"
    | "call"
    | "query-meeting-state";
  action: MeetingAction;
}

const actionService: { [A in MeetingAction]: ControlMessage["service"] } = {
  "toggle-mute": "toggle-mute",
  "toggle-video": "toggle-video",
  "toggle-background-blur": "background-blur",
  "toggle-recording": "recording",
  "toggle-hand": "raise-hand",
  "leave-call": "call",
  "react-applause": "call",
  "react-laugh": "call",
  "react-like": "call",
  "react-love": "call",
  "react-wow": "call",
  "query-meeting-state": "query-meeting-state",
};

class Deferred<T> {
  readonly promise: Promise<T>;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resolve: (result: T) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-explicit-any
  reject: (reason?: any) => void = () => {};

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

interface MeetingClientProps {
  onConnected?: (msg?: UpdateMessage) => void;
  onMessage?: (msg: UpdateMessage) => void;
  onError?: (event: ErrorEvent) => void;
  onClose?: () => void;
}

export class MeetingClient {
  private readonly ws: WebSocket;
  private readonly updateMessageDeferred: Deferred<UpdateMessage>[] = [];
  private readonly messageCallback: ((msg: UpdateMessage) => void) | undefined;

  public constructor(props: MeetingClientProps) {
    const queryParams = {
      "protocol-version": apiVersion,
      manufacturer,
      device,
      app,
      "app-version": appVersion,
    };
    const paramNames = Object.keys(queryParams) as (keyof typeof queryParams)[];
    const params = paramNames.map((key) => `${key}=${encodeURI(queryParams[key])}`).join("&");
    const url = `ws://${host}:${port}?token=${prefs.apiToken}&${params}`;
    console.debug(`Connecting to ${url} …`);
    this.messageCallback = props.onMessage;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      console.debug("websocket connected");
      props.onConnected?.();
    };
    this.ws.onclose = () => {
      console.log("websocket closed");
      props.onClose?.();
    };
    this.ws.onerror = props.onError ?? null;
    this.ws.onmessage = (event: MessageEvent) => this.onMessage(event);
  }

  private onMessage(event: MessageEvent) {
    console.debug(event.type);
    console.debug(event.data);
    const forAllDeferred = (handle: (deferred: Deferred<UpdateMessage>) => void) => {
      while (this.updateMessageDeferred.length > 0) {
        const deferred = this.updateMessageDeferred.pop();
        if (deferred) {
          handle(deferred);
        }
      }
    };
    const msg = JSON.parse(event.data.toString());
    if (isUpdateMessage(msg)) {
      forAllDeferred((deferred) => deferred.resolve(msg));
      this.messageCallback?.(msg);
    } else {
      forAllDeferred((deferred) => deferred.reject(msg));
    }
  }

  public sendAction(action: MeetingAction) {
    this.sendMessage({ action, service: actionService[action] });
  }

  public async sendActionAndRequestMeetingState(action: MeetingAction): Promise<UpdateMessage> {
    const deferredUpdateMessage = new Deferred<UpdateMessage>();
    this.updateMessageDeferred.push(deferredUpdateMessage);
    this.sendAction(action);
    return deferredUpdateMessage.promise;
  }

  public async requestMeetingState(): Promise<UpdateMessage> {
    return this.sendActionAndRequestMeetingState("query-meeting-state");
  }

  private sendMessage(msg: Pick<ControlMessage, "service" | "action">) {
    const fullMsg: ControlMessage = {
      apiVersion,
      manufacturer,
      device,
      timestamp: Math.trunc(Date.now() / 1000),
      ...msg,
    };
    console.log(fullMsg);
    this.ws.send(JSON.stringify(fullMsg));
  }

  public close() {
    this.ws.close();
  }
}

export async function asyncMeetingClient(onError?: (event: ErrorEvent) => void): Promise<MeetingClient> {
  const deferred = new Deferred<MeetingClient>();
  const client: MeetingClient = new MeetingClient({
    onConnected: () => deferred.resolve(client),
    onError,
  });
  return deferred.promise;
}
