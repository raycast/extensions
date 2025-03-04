import WebSocket, { MessageEvent } from "ws";
import {
  CallAction,
  Deferred,
  MeetingAction,
  MeetingClient,
  MeetingClientProps,
  MeetingPermissions,
  MeetingState,
  QueryMeetingStateAction,
  ReactAction,
  ToggleBackgroundBlurAction,
  ToggleHandAction,
  ToggleMuteAction,
  ToggleRecordingAction,
  ToggleVideoAction,
  UpdateMessage,
} from "./meetingClient";
import { getToken, setToken } from "./storage";

const host = "127.0.0.1";
const port = 8124;
const apiVersion = "2.0.0";
const manufacturer = "Sven Wiegand";
const device = "Raycast";
const app = "Raycast";
const appVersion = "1.0.0";

type MeetingActionV2 =
  | ToggleMuteAction
  | ToggleVideoAction
  | ToggleBackgroundBlurAction
  | ToggleRecordingAction
  | ToggleHandAction
  | CallAction
  | "send-reaction"
  | QueryMeetingStateAction;

interface ControlMessageV2 {
  requestId: number;
  action: MeetingActionV2;
  parameters?: ParametersV2;
}

export interface ParametersV2 {
  type: "like" | "love" | "applause" | "laugh" | "wow";
}

interface UpdateMessageV2 {
  apiVersion: string;
  meetingUpdate: {
    meetingState?: MeetingStateV2;
    meetingPermissions: MeetingPermissions;
  };
}

interface MeetingStateV2 {
  isMuted: boolean;
  isVideoOn: boolean;
  isHandRaised: boolean;
  isInMeeting: boolean;
  isRecordingOn: boolean;
  isBackgroundBlurred: boolean;
}

interface TokenRefreshMessage {
  tokenRefresh: string;
}

interface ResponseMessage {
  requestId: number;
  response: string;
}

export class MeetingClientV2 implements MeetingClient {
  private ws: WebSocket | undefined;
  private readonly updateMessageDeferred: Deferred<UpdateMessage>[] = [];
  private readonly messageCallback: ((msg: UpdateMessage) => void) | undefined;
  private lastCommandFinished = false;
  private lastUpdate = {} as UpdateMessage;

  public constructor(props: MeetingClientProps) {
    this.messageCallback = props.onMessage;
    getToken().then(
      (token) => {
        console.debug("token loaded from storage: " + token);
        this.connectWS(token, props);
      },
      () => {
        console.debug("token not found in storage.");
        this.connectWS(undefined, props);
      }
    );
  }

  private connectWS(token: string | undefined, props: MeetingClientProps) {
    const queryParams = {
      "protocol-version": apiVersion,
      manufacturer,
      device,
      app,
      "app-version": appVersion,
    };
    const paramNames = Object.keys(queryParams) as (keyof typeof queryParams)[];
    const params = paramNames.map((key) => `${key}=${encodeURI(queryParams[key])}`).join("&");
    const url = `ws://${host}:${port}?${token ? "token=" + token : ""}&${params}`;

    console.debug(`Connecting to ${url} …`);
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
    if (this.isUpdateMessageV2(msg)) {
      const statusMessageV1 = this.convertUpdateMessageToV1(msg);
      if (this.lastCommandFinished) {
        this.lastUpdate = statusMessageV1;
        forAllDeferred((deferred) => deferred.resolve(statusMessageV1));
      }
      this.messageCallback?.(statusMessageV1);
    } else if (this.isTokenRefreshMessage(msg)) {
      console.debug("Refresh token message. Updating local storage.");
      setToken(msg.tokenRefresh);
    } else if (this.isResponseMessage(msg)) {
      if (msg.requestId === 0) {
        // only for responses to our requests
        this.lastCommandFinished = true;
      }
    } else {
      forAllDeferred((deferred) => deferred.reject(msg));
    }
  }

  private convertUpdateMessageToV1(msg: UpdateMessageV2): UpdateMessage {
    const meetingState: MeetingState | undefined = msg.meetingUpdate.meetingState
      ? {
          ...msg.meetingUpdate.meetingState,
          isCameraOn: msg.meetingUpdate.meetingState.isVideoOn,
        }
      : undefined;
    return {
      ...msg,
      meetingUpdate: {
        ...msg.meetingUpdate,
        meetingState,
      },
    };
  }

  public sendAction(action: MeetingAction) {
    this.lastCommandFinished = false;
    this.sendMessage(this.convertMeetingActionToControlMessage(action));
  }

  private convertMeetingActionToControlMessage(action: MeetingAction) {
    if (action.startsWith("react-")) {
      const mapParameter: { [A in ReactAction]: ParametersV2 } = {
        "react-applause": { type: "applause" },
        "react-laugh": { type: "laugh" },
        "react-like": { type: "like" },
        "react-love": { type: "love" },
        "react-wow": { type: "wow" },
      };
      const controlMessage: ControlMessageV2 = {
        requestId: 0,
        action: "send-reaction",
        parameters: mapParameter[action as ReactAction],
      };
      return controlMessage;
    } else {
      const controlMessage = {
        requestId: 0,
        action: action as MeetingActionV2,
      };
      return controlMessage;
    }
  }

  public async sendActionAndRequestMeetingState(action: MeetingAction): Promise<UpdateMessage> {
    const deferredUpdateMessage = new Deferred<UpdateMessage>();
    this.updateMessageDeferred.push(deferredUpdateMessage);
    this.sendAction(action);
    return deferredUpdateMessage.promise;
  }

  public async requestMeetingState(): Promise<UpdateMessage> {
    //not sure how to request an update state in V2. Returning saved state for now.
    return Promise.resolve(this.lastUpdate);
  }

  private sendMessage(msg: ControlMessageV2) {
    console.log(msg);
    this.ws?.send(JSON.stringify(msg));
  }

  private isUpdateMessageV2(msg: any): msg is UpdateMessageV2 {
    return "meetingUpdate" in msg;
  }

  private isTokenRefreshMessage(msg: any): msg is TokenRefreshMessage {
    return "tokenRefresh" in msg;
  }

  private isResponseMessage(msg: any): msg is ResponseMessage {
    return "response" in msg;
  }

  public close() {
    this.ws?.close();
  }
}
