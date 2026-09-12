import WebSocket, { ErrorEvent, MessageEvent } from "ws";
import { getToken, setToken } from "./storage";

// ---------------------------------------------------------------------------
// Domain model — the shape the rest of the app works with. It is intentionally
// decoupled from the raw Teams wire format (see the `Wire*` types below), which
// carries extra fields we don't use and names some fields differently.
// ---------------------------------------------------------------------------

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
  canPair?: boolean; // only present while the client may still pair with Teams
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

// ---------------------------------------------------------------------------
// Wire format — exactly what the Teams local API (protocol 2.0.0) sends and
// expects on the WebSocket. Kept private to this module; everything outside
// only ever sees the domain model above.
// ---------------------------------------------------------------------------

const host = "127.0.0.1";
const port = 8124;
const protocolVersion = "2.0.0";
const manufacturer = "Sven Wiegand";
const device = "Raycast";
const app = "Raycast";
const appVersion = "1.0.0";
const tokenRefreshTimeoutMs = 5000;

type WireAction =
  | ToggleMuteAction
  | ToggleVideoAction
  | ToggleBackgroundBlurAction
  | ToggleRecordingAction
  | ToggleHandAction
  | CallAction
  | "send-reaction"
  | QueryMeetingStateAction;

interface ControlMessage {
  requestId: number;
  action: WireAction;
  parameters?: ReactionParameters;
}

interface ReactionParameters {
  type: "like" | "love" | "applause" | "laugh" | "wow";
}

interface WireUpdateMessage {
  apiVersion: string;
  meetingUpdate: {
    meetingState?: WireMeetingState;
    meetingPermissions: MeetingPermissions;
  };
}

interface WireMeetingState {
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

export class MeetingClient {
  private ws: WebSocket | undefined;
  private readonly updateMessageDeferred: Deferred<UpdateMessage>[] = [];
  private readonly messageCallback: ((msg: UpdateMessage) => void) | undefined;
  private tokenRefreshDeferred = new Deferred<void>();
  private tokenSave: Promise<void> = Promise.resolve();
  private connectedWithToken = false;
  private lastCommandFinished = false;
  private lastUpdate: UpdateMessage | undefined;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private settleBaseline: MeetingState | undefined;
  private static readonly settleFallbackMs = 1000;

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
    this.connectedWithToken = Boolean(token);
    const queryParams = new URLSearchParams({
      "protocol-version": protocolVersion,
      manufacturer,
      device,
      app,
      "app-version": appVersion,
    });
    if (token) {
      queryParams.set("token", token);
    }
    const url = `ws://${host}:${port}?${queryParams.toString()}`;

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
    const msg = JSON.parse(event.data.toString());
    if (this.isWireUpdateMessage(msg)) {
      const update = this.wireToUpdateMessage(msg);
      if (this.lastCommandFinished) {
        this.lastUpdate = update;
        this.handleSettledCandidate(update);
      }
      this.messageCallback?.(update);
    } else if (this.isTokenRefreshMessage(msg)) {
      console.debug("Refresh token message. Updating local storage.");
      this.tokenSave = setToken(msg.tokenRefresh);
      this.connectedWithToken = true;
      this.tokenRefreshDeferred.resolve();
    } else if (this.isResponseMessage(msg)) {
      if (msg.requestId === 0) {
        // only for responses to our requests
        this.lastCommandFinished = true;
      }
    } else {
      this.rejectAllDeferred(msg);
    }
  }

  // Teams answers a state-changing command with the *previous* state first and
  // only pushes the genuinely updated state a few milliseconds later (observed as
  // a second response/update pair). The first update after a command can therefore
  // not be trusted. We treat the first observed update as a baseline and resolve as
  // soon as we see a state that actually differs from it. A short fallback timeout
  // resolves with the latest state in case nothing ever changes (plain queries or
  // no-op toggles), so we never hang.
  private handleSettledCandidate(update: UpdateMessage) {
    const state = update.meetingUpdate.meetingState;
    if (this.settleBaseline && state && !this.meetingStateEquals(this.settleBaseline, state)) {
      this.resolveAllDeferred(update);
      return;
    }
    if (!this.settleBaseline && state) {
      this.settleBaseline = state;
    }
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
    }
    this.settleTimer = setTimeout(() => this.resolveAllDeferred(update), MeetingClient.settleFallbackMs);
  }

  private resolveAllDeferred(update: UpdateMessage) {
    this.drainDeferred((deferred) => deferred.resolve(update));
  }

  private rejectAllDeferred(reason: unknown) {
    this.drainDeferred((deferred) => deferred.reject(reason));
  }

  private drainDeferred(handle: (deferred: Deferred<UpdateMessage>) => void) {
    this.clearSettleState();
    while (this.updateMessageDeferred.length > 0) {
      const deferred = this.updateMessageDeferred.pop();
      if (deferred) {
        handle(deferred);
      }
    }
  }

  private clearSettleState() {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = undefined;
    }
    this.settleBaseline = undefined;
  }

  private meetingStateEquals(a: MeetingState, b: MeetingState): boolean {
    return (
      a.isMuted === b.isMuted &&
      a.isCameraOn === b.isCameraOn &&
      a.isHandRaised === b.isHandRaised &&
      a.isInMeeting === b.isInMeeting &&
      a.isRecordingOn === b.isRecordingOn &&
      a.isBackgroundBlurred === b.isBackgroundBlurred
    );
  }

  private wireToUpdateMessage(msg: WireUpdateMessage): UpdateMessage {
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
    this.sendMessage(this.toControlMessage(action));
  }

  private toControlMessage(action: MeetingAction): ControlMessage {
    if (action.startsWith("react-")) {
      const mapParameter: { [A in ReactAction]: ReactionParameters } = {
        "react-applause": { type: "applause" },
        "react-laugh": { type: "laugh" },
        "react-like": { type: "like" },
        "react-love": { type: "love" },
        "react-wow": { type: "wow" },
      };
      return {
        requestId: 0,
        action: "send-reaction",
        parameters: mapParameter[action as ReactAction],
      };
    } else {
      return {
        requestId: 0,
        action: action as WireAction,
      };
    }
  }

  public async sendActionAndRequestMeetingState(action: MeetingAction): Promise<UpdateMessage> {
    const deferredUpdateMessage = new Deferred<UpdateMessage>();
    this.updateMessageDeferred.push(deferredUpdateMessage);
    this.sendAction(action);
    const updateMessage = await deferredUpdateMessage.promise;
    await this.waitForTokenRefreshIfPairing(updateMessage);
    return updateMessage;
  }

  private async waitForTokenRefreshIfPairing(updateMessage: UpdateMessage) {
    const mightBePairing = !this.connectedWithToken || updateMessage.meetingUpdate.meetingPermissions.canPair;
    if (!mightBePairing) {
      await this.tokenSave;
      return;
    }

    await Promise.race([
      this.tokenRefreshDeferred.promise,
      new Promise<void>((resolve) => setTimeout(resolve, tokenRefreshTimeoutMs)),
    ]);
    await this.tokenSave;
  }

  public async requestMeetingState(): Promise<UpdateMessage | undefined> {
    // The Teams API offers no explicit state query on this protocol, so we
    // return the last state we received, or undefined if none has arrived yet.
    return Promise.resolve(this.lastUpdate);
  }

  private sendMessage(msg: ControlMessage) {
    console.log(msg);
    this.ws?.send(JSON.stringify(msg));
  }

  private isWireUpdateMessage(msg: any): msg is WireUpdateMessage {
    return "meetingUpdate" in msg;
  }

  private isTokenRefreshMessage(msg: any): msg is TokenRefreshMessage {
    return "tokenRefresh" in msg;
  }

  private isResponseMessage(msg: any): msg is ResponseMessage {
    return "response" in msg;
  }

  public close() {
    this.clearSettleState();
    this.ws?.close();
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
