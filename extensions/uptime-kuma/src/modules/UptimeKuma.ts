// Written by: MarlburroW
// Description: UptimeKuma Websocket client

import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";

export enum MonitorStatus {
  DOWN,
  UP,
  PENDING,
  MAINTENANCE,
}

export interface Heartbeat {
  monitorID: string;
  status: MonitorStatus;
  time: string;
  ping: number;
  msg: string;
  duration: number;
}

export interface Uptime {
  monitorID: string;
  period: number;
  percent: number;
}

export interface Monitor {
  id: number;
  name: string;
  url: string;
  uptime24: number | undefined;
  uptime720: number | undefined;
  heartbeat: Heartbeat | undefined;
  heartbeats: Array<Heartbeat> | undefined;
  avgPing: number | undefined;
  type: string;
  tags: Array<Tag>;
  port: number | null;
  active: boolean;
}

export interface HeartbeatList {
  monitorID: string;
  heartbeatList: Array<Heartbeat>;
}

export interface AvgPing {
  monitorID: string;
  avgPing: number;
}

export interface Tag {
  id: number;
  color: string;
  name: string;
  value: string;
  tag_id: number;
}

export interface LoginResponse {
  ok: boolean;
  msg: string;
  token: string;
  tokenRequired: boolean;
}
type Callback = (...args: unknown[]) => unknown;

export class UptimeKuma extends EventEmitter {
  url: string;
  username: string | null = null;
  password: string | null = null;
  socket: Socket | null = null;
  token: string | null = null;
  token2fa: string | null = null;

  constructor(url: string, token: string | null = null) {
    super();
    this.url = url;
    if (token) {
      this.token = token;
    }
  }

  setSettings({ url, token }: { url: string; token: string }) {
    this.url = url;
    this.token = token;
  }

  connect() {
    if (this.isConnected()) {
      this.disconnect();
    }

    this.socket = io(this.url, {
      reconnection: true,
    });

    this.socket.on("disconnect", (reason: string) => {
      this.emit("disconnect", `Disconnected: ${reason}`);
    });

    this.socket.on("connect_error", (err: Error) => {
      this.emit("error", `Connection error: ${err.message}`);
    });

    this.socket.on("connect", () => {
      this.emit("connected");

      this.socket?.on("heartbeat", (heartbeat: Heartbeat) => {
        this.emit("heartbeat", heartbeat);
      });

      this.socket?.on("monitorList", (monitors: Array<Monitor>) => {
        this.emit("monitorList", monitors);
      });

      this.socket?.on("uptime", (monitorID: string, period: number, percent: number) => {
        this.emit("uptime", {
          monitorID,
          period,
          percent,
        });
      });

      this.socket?.on("avgPing", (monitorID: string, avgPing: number) => {
        this.emit("avgPing", {
          monitorID,
          avgPing,
        });
      });

      this.socket?.on("heartbeatList", (monitorID: string, heartbeatList: Array<Heartbeat>) => {
        this.emit("heartbeatList", {
          monitorID,
          heartbeatList,
        });
      });

      // this.socket.onAny((eventName) => {
      //   console.log(eventName);
      // });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return !!this.socket?.connected;
  }

  hasConnectionParameters() {
    return this.url && this.token;
  }

  authenticate() {
    this.socket?.emit("loginByToken", this.token, (response: LoginResponse) => {
      if (response.ok) {
        this.emit("authenticated");
      } else {
        if (response.msg) {
          this.emit("error", response.msg);
        } else {
          this.emit("error", "Authentication failed");
        }
      }
    });
  }

  getToken(username: string, password: string, token2fa: string | null = null) {
    this.socket?.emit(
      "login",
      {
        username: username,
        password: password,
        token: token2fa,
      },
      (response: LoginResponse) => {
        if (response.ok) {
          this.token = response.token;
          this.emit("token", this.token);
        } else {
          if (response.tokenRequired) {
            this.emit("2faRequired");
          } else if (response.msg) {
            this.emit("error", response.msg);
          } else {
            this.emit("error", "Authentication failed");
          }
        }
      },
    );
  }

  pauseMonitor(monitorID: number, CB: Callback) {
    this.socket?.emit("pauseMonitor", monitorID, CB);
  }

  resumeMonitor(monitorID: number, CB: Callback) {
    this.socket?.emit("resumeMonitor", monitorID, CB);
  }

  requestMonitorList() {
    this.socket?.emit("monitorList", (monitors: Array<Monitor>) => {
      this.emit("monitorList", monitors);
    });
  }
}

export default UptimeKuma;
