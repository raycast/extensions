import {
  BridgeConfig,
  BridgeHome,
  GroupedLight,
  GroupedLightRequest,
  HueEvent,
  HueResource,
  HueResponse,
  Light,
  LightRequest,
  ResourceIdentifier,
  Room,
  Scene,
  SceneRequest,
  ZigbeeConnectivity,
  Zone,
} from "./types";
import {
  ClientHttp2Session,
  IncomingHttpHeaders,
  IncomingHttpStatusHeader,
  OutgoingHttpHeaders,
  sensitiveHeaders,
} from "http2";
import { text } from "stream/consumers";
import { setTimeout as sleep } from "timers/promises";
import RateLimitedQueue from "./RateLimitedQueue";
import { logError } from "../helpers/errors";
import { CONNECTION_TIMEOUT_MS } from "../helpers/constants";

const DATA_PREFIX = "data: ";
const SOFT_OFF = 'device (grouped_light) is "soft off", command (.on) may not have effect';

// The bridge no longer accepts the username: it was removed in the Hue app, or the bridge was reset. Carries the
// address that answered, a moved bridge's new one, to link again at.
export class UnauthorizedError extends Error {
  constructor(readonly ipAddress: string) {
    super("Hue Bridge rejected the username");
  }
}

export const authHeaders = (username: string) => ({
  "hue-application-key": username,
  [sensitiveHeaders]: ["hue-application-key"],
});

// A request the bridge never answers would otherwise hold up the rate-limited queues for good.
export async function request(session: ClientHttp2Session, headers: OutgoingHttpHeaders, body?: object) {
  const signal = AbortSignal.timeout(CONNECTION_TIMEOUT_MS);
  try {
    const stream = session.request(headers, { endStream: body === undefined, signal });
    if (body !== undefined) stream.end(JSON.stringify(body));
    let responseHeaders: IncomingHttpHeaders & IncomingHttpStatusHeader = {};
    stream.once("response", (received) => (responseHeaders = received));
    const data = await text(stream);
    // A connection the bridge closes ends the stream without a response.
    if (responseHeaders[":status"] === undefined) throw new Error("No response");
    return { headers: responseHeaders, data };
  } catch (error) {
    if (signal.aborted) {
      // A busy bridge answers 429 or 503 at once, so silence means a dead connection, after the network changed or the
      // computer slept. Destroying the session lets the client reconnect.
      session.destroy();
      throw new Error("Request to Hue Bridge timed out", { cause: error });
    }
    throw new Error("Lost connection to Hue Bridge", { cause: error });
  }
}

export default class HueClient {
  private readonly lightsQueue = new RateLimitedQueue(10);
  private readonly groupedLightsQueue = new RateLimitedQueue(1);

  readonly createdAt = Date.now();

  constructor(
    readonly bridgeConfig: BridgeConfig,
    private readonly http2Session: ClientHttp2Session,
  ) {
    // An error also closes the session, which onDisconnect reports. Without a listener, it would crash the command.
    http2Session.on("error", logError);
  }

  // Ends the session once its open streams, like the event stream, close.
  public close() {
    this.http2Session.close();
  }

  // Calls back once the client can't be used any more: its session closed, also when the event stream ended, or the
  // bridge sent GOAWAY, which it does after about 1000 requests on a session.
  public onDisconnect(callback: () => void): () => void {
    const session = this.http2Session;
    if (session.closed || session.destroyed) {
      callback();
      return () => {};
    }
    session.once("goaway", callback).once("close", callback);
    return () => session.off("goaway", callback).off("close", callback);
  }

  public getLights(): Promise<Light[]> {
    return this.getAll<Light>("light");
  }

  // The bridge errors on parallel requests (as if an endpoint is missing), so fetch sequentially.
  // Lights load last: useHue applies them all at once, and older snapshots undo optimistic updates.
  // The property names are useHueResources' useCachedState keys, which toggleAllLights also writes.
  public async getResources() {
    return {
      rooms: await this.getAll<Room>("room"),
      zones: await this.getAll<Zone>("zone"),
      scenes: await this.getAll<Scene>("scene"),
      zigbeeConnectivity: await this.getAll<ZigbeeConnectivity>("zigbee_connectivity"),
      lights: await this.getLights(),
    };
  }

  // The bridge has exactly one.
  public async getBridgeHome(): Promise<BridgeHome> {
    const [bridgeHome] = await this.getAll<BridgeHome>("bridge_home");
    return bridgeHome;
  }

  private getAll<R extends HueResource>(type: R["type"]): Promise<R[]> {
    return this.makeRequest<R>("GET", `/clip/v2/resource/${type}`);
  }

  public updateLight(light: Light, properties: LightRequest): Promise<ResourceIdentifier[]> {
    return this.lightsQueue.enqueueRequest(() =>
      this.makeRequest<ResourceIdentifier>("PUT", `/clip/v2/resource/light/${light.id}`, properties),
    );
  }

  public updateGroupedLight(
    groupedLight: Pick<GroupedLight, "id">,
    properties: GroupedLightRequest,
  ): Promise<ResourceIdentifier[]> {
    return this.groupedLightsQueue.enqueueRequest(() =>
      this.makeRequest<ResourceIdentifier>("PUT", `/clip/v2/resource/grouped_light/${groupedLight.id}`, properties)
        // The bridge applies the change, but warns that lights switched off in software stay off.
        .catch((error: Error) => {
          if (error.message !== SOFT_OFF) throw error;
          return [];
        }),
    );
  }

  public updateScene(scene: Scene, properties: SceneRequest): Promise<ResourceIdentifier[]> {
    return this.makeRequest<ResourceIdentifier>("PUT", `/clip/v2/resource/scene/${scene.id}`, properties);
  }

  private async makeRequest<T>(method: "GET" | "PUT", path: string, body?: object, attempt = 1): Promise<T[]> {
    const { headers, data } = await request(
      this.http2Session,
      { ":method": method, ":path": path, ...authHeaders(this.bridgeConfig.username) },
      body,
    );
    const status = headers[":status"];

    // The bridge turns requests away with 429 when more than 8 are in flight, also from other commands, and with 503 when
    // busy, before handling them, so retrying is safe, also for changes.
    if ((status === 429 || status === 503) && attempt < 3) {
      await sleep(250 * attempt);
      return this.makeRequest<T>(method, path, body, attempt + 1);
    }

    // Whatever went wrong, the bridge sends the same HTML page, even with status 200, so only the status tells.
    if (headers["content-type"] === "text/html") {
      if (status === 403) {
        // Reconnecting leads to the Link Again screen. Closing would wait for the event stream, which may stay open.
        this.http2Session.destroy();
        throw new UnauthorizedError(this.bridgeConfig.ipAddress);
      }
      if (status === 429 || status === 503) throw new Error("Hue Bridge is busy, try again");
      throw new Error(`Status ${status} from Hue Bridge`);
    }

    const response: HueResponse<T> = JSON.parse(data);

    if (response.errors != null && response.errors.length > 0) {
      const errorMessage = response.errors.map((error) => error.description).join(", ");
      console.error({ headers, message: errorMessage });
      throw new Error(errorMessage);
    }

    return response.data;
  }

  public listenToEventSource(onEvent: (event: HueEvent) => void): () => void {
    // Node 22 throws, inside the effect that listens, when the session closed before the effect ran.
    if (this.http2Session.closed || this.http2Session.destroyed) return () => {};
    const stream = this.http2Session.request(
      {
        ":method": "GET",
        ":path": "/eventstream/clip/v2",
        accept: "text/event-stream",
        ...authHeaders(this.bridgeConfig.username),
      },
      { endStream: true },
    );

    let buffer = "";

    stream.setEncoding("utf8");

    stream.on("data", (chunk) => {
      const lines = (buffer + chunk).split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith(DATA_PREFIX)) continue;
        try {
          (JSON.parse(line.slice(DATA_PREFIX.length)) as HueEvent[]).forEach((event) => onEvent(event));
        } catch (error) {
          logError(error);
        }
      }
    });

    stream.on("error", logError);
    // Without the event stream, the client would fall behind the bridge. It also ends when the bridge answers with an
    // error, like 403 for a username it no longer accepts.
    stream.once("close", () => this.close());

    return () => stream.close();
  }
}
