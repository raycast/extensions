import WebSocket from "ws";
import { StreamedIdentifiersFromJSON } from "@pieces.app/pieces-os-client";
import DedupeAssetQueue from "./DedupeAssetQueue";
import { Nullable } from "../../types/nullable";
import AssetsController from "../../controllers/AssetsController";
import ConnectorSingleton from "../ConnectorSingleton";

/**
 * Entry point for the /assets/stream/identifiers websocket
 * Handles the events, and sends them to the fetch queue
 */
export default class AssetStream {
  private static instance: AssetStream;

  private ws: Nullable<WebSocket> = null;

  private constructor() {
    this.connect();
  }

  /**
   * if the socket is not open, this function will open the socket.
   */
  public openSocket = () => {
    if (!this.ws) this.connect();
  };

  /**
   * Private connection handler for the ws
   * Handles the socket messages, sending them to the queue if needed.
   */
  private async connect() {
    const host = await ConnectorSingleton.getHost();
    this.ws = new WebSocket(
      host.replace("https://", "wss://").replace("http://", "ws://") +
        "/assets/stream/identifiers",
    );
    let firstMessage = false;
    this.ws.onmessage = (event) => {
      const assets = StreamedIdentifiersFromJSON(
        JSON.parse(event.data.toString()),
      );
      if (!firstMessage) {
        firstMessage = true;
        assets.iterable = assets.iterable.reverse();
        AssetsController.getInstance().validate(assets.iterable);
      }
      for (let i = 0; i < assets.iterable.length; i++) {
        const asset = assets.iterable[i];
        if (!asset.asset)
          throw new Error(
            "got an identifier in the assets stream that is not an asset",
          );

        if (asset.deleted) {
          AssetsController.getInstance().delete(assets.iterable[i].asset!.id);
        } else {
          DedupeAssetQueue.getInstance().push(asset.asset.id);
        }
      }
    };

    /**
     * If the socket connection closes, we run this
     * @param err optional error event
     */
    const handleClose = (err: WebSocket.CloseEvent | WebSocket.ErrorEvent) => {
      if (err && "message" in err)
        console.error("Asset stream error: " + err.message);
      this.ws = null;
    };

    this.ws.onerror = handleClose;
    this.ws.onclose = handleClose;
  }

  public static getInstance() {
    return (this.instance ??= new AssetStream());
  }
}
