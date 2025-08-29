import WebSocket from "ws";
import { Nullable } from "../../types/nullable";
import ConnectorSingleton from "../ConnectorSingleton";
import PiecesPreflightService from "../health/piecesPreflightCheck";
import { UserProfileFromJSON } from "@pieces.app/pieces-os-client";

/**
 * Entry point for the /user/stream websocket
 * Handles user authentication state changes and updates the preflight cache accordingly
 */
export default class UserStream {
  private static instance: UserStream;

  private ws: Nullable<WebSocket> = null;

  private constructor() {
    this.openSocket();
  }

  /**
   * if the socket is not open, this function will open the socket.
   */
  public openSocket = () => {
    if (!this.ws) this.connect();
  };

  /**
   * Private connection handler for the ws
   * Handles user authentication state changes
   */
  private async connect() {
    try {
      const host = await ConnectorSingleton.getHost();
      this.ws = new WebSocket(
        host.replace("https://", "wss://").replace("http://", "ws://") +
          "/user/stream",
      );

      this.ws.onmessage = (event) => {
        try {
          PiecesPreflightService.getInstance().user = event.data
            ? UserProfileFromJSON(JSON.parse(event.data.toString()))
            : null;
        } catch (error) {
          console.error("Error processing user stream message:", error);
        }
      };

      this.ws.onopen = () => {
        console.log("User stream connected");
      };

      /**
       * If the socket connection closes, we run this
       * @param err optional error event
       */
      const handleClose = (
        err: WebSocket.CloseEvent | WebSocket.ErrorEvent,
      ) => {
        if (err && "message" in err) {
          console.error("User stream error:", err.message);
        } else {
          console.log("User stream connection closed");
        }
        this.ws = null;

        // Attempt to reconnect after a delay
        setTimeout(() => {
          this.connect();
        }, 5000);
      };

      this.ws.onerror = handleClose;
      this.ws.onclose = handleClose;
    } catch (error) {
      console.error("Failed to connect to user stream:", error);
      this.ws = null;

      // Attempt to reconnect after a delay
      setTimeout(() => {
        this.connect();
      }, 5000);
    }
  }

  /**
   * Close the websocket connection
   */
  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public static getInstance() {
    return (this.instance ??= new UserStream());
  }
}
