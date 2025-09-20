import { EventEmitter } from "events";

import WebSocket from "ws";

import { NewIWorkspaceErrorObject } from "./Models/IWorkspaceError";
import { NewIWorkspaceUpdateObject } from "./Models/IWorkspaceUpdate";

// export interface StartWorkspace {
//   method: "startWorkspace";
//   params: string;
// }

// export interface StopWorkspace {
//   method: "stopWorkspace";
//   params: string;
// }

export interface CreateWorkspace {
  method: "createWorkspace";
  params: {
    contextUrl: string;
    organizationId: string;
    ignoreRunningWorkspaceOnSameCommit: true;
    ignoreRunningPrebuild: true;
    ideSetting: {
      defaultIde: string;
      useLatestVersion: false;
    };
  };
}

export type APIEvents = "errorOccured" | "instanceUpdated";
// export type WorkspaceMethods = StartWorkspace | StopWorkspace
export type WorkspaceMethods = CreateWorkspace;

export class WorkspaceStreamer extends EventEmitter {
  private static instance: WorkspaceStreamer;

  // TODO: Convert to TCP Transport, rather than a websocket connection
  private static webSocket: WebSocket;
  private static connected = false;
  private static error: WebSocket.ErrorEvent;
  public static token: string;

  constructor(token: string) {
    super();
    try {
      WorkspaceStreamer.token = token;
      // Create new transport for GRPC Messages
      WorkspaceStreamer.webSocket = new WebSocket("wss://gitpod.io/api/v1", {
        headers: {
          Origin: new URL("https://gitpod.io").origin,
          Authorization: `Bearer ${token}`,
        },
      });

      // Register Connection Establishment Methods
      WorkspaceStreamer.webSocket.onopen = (_) => {
        this.registerWebSocketEvents();
        WorkspaceStreamer.connected = true;
      };

      WorkspaceStreamer.webSocket.onerror = (error) => {
        this.emit("errorOccured", NewIWorkspaceErrorObject(error));
        WorkspaceStreamer.error = error;
      };
    } catch (e) {
      // Look for errors in case of internet failure or connection failure
      this.emit("errorOccured", NewIWorkspaceErrorObject(e));
    }
  }

  public static getInstance(): WorkspaceStreamer {
    if (!WorkspaceStreamer.instance) {
      throw new Error("GitpodAPI Class not initialized yet.");
    }
    return WorkspaceStreamer.instance;
  }

  public on(event: APIEvents, listener: (event: any) => void) {
    return super.on(event, listener);
  }

  public execute(method: WorkspaceMethods) {
    // EXECUTOR OR EMITTER
    if (WorkspaceStreamer.connected == true) {
      const data = {
        jsonrpc: "2.0",
        id: Math.round(Math.random() * 1000),
        ...method,
      };
      WorkspaceStreamer.webSocket.send(JSON.stringify(data));
    } else {
      this.emit("errorOccured", NewIWorkspaceErrorObject(WorkspaceStreamer.error));
    }
  }

  private registerWebSocketEvents() {
    // LISTENER
    // here I have to parse all the messages and then emit according to the type of message that has been occured
    // Currently let's go for start only

    WorkspaceStreamer.webSocket.on("message", (message) => {
      const jsonObj = JSON.parse(message.toString());
      if (jsonObj.method) {
        if (jsonObj.method == "onInstanceUpdate") {
          this.emit("instanceUpdated", NewIWorkspaceUpdateObject(jsonObj));
        }
      }
      if (jsonObj.error) {
        this.emit("errorOccured", NewIWorkspaceErrorObject(jsonObj.error));
      }
    });
  }
}
