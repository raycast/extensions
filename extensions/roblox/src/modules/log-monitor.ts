import { readFileSync, statSync, readdirSync, existsSync, Stats } from "fs";
import { join, extname } from "path";
import { homedir } from "os";

export interface Message {
  Command: string;
  Data: string;
}

export enum ServerType {
  Private = "Private",
  Reserved = "Reserved",
}

export interface ActivityData {
  PlaceId: number;
  JobId: string;
  MachineAddress: string;
  AccessCode?: string;
  UniverseId?: number;
  UserId?: number;
  IsTeleport?: boolean;
  ServerType?: ServerType;
  TimeJoined?: Date;
  TimeLeft?: Date;
  RPCLaunchData?: string;
}

export class LogMonitor {
  // Log entry constants
  private static readonly GameMessageEntry = "[FLog::Output] [BloxstrapRPC]";
  private static readonly GameJoiningEntry = "[FLog::Output] ! Joining game";
  private static readonly GameTeleportingEntry = "[FLog::GameJoinUtil] GameJoinUtil::initiateTeleportToPlace";
  private static readonly GameJoiningPrivateServerEntry =
    "[FLog::GameJoinUtil] GameJoinUtil::joinGamePostPrivateServer";
  private static readonly GameJoiningReservedServerEntry =
    "[FLog::GameJoinUtil] GameJoinUtil::initiateTeleportToReservedServer";
  private static readonly GameJoiningUniverseEntry = "[FLog::GameJoinLoadTime] Report game_join_loadtime:";
  private static readonly GameJoiningUDMUXEntry = "[FLog::Network] UDMUX Address = ";
  private static readonly GameJoinedEntry = "[FLog::Network] serverId:";
  private static readonly GameDisconnectedEntry = "[FLog::Network] Time to disconnect replication data:";
  private static readonly GameLeavingEntry = "[FLog::SingleSurfaceApp] leaveUGCGameInternal";

  // Regex patterns
  private static readonly GameJoiningEntryPattern = /! Joining game '([0-9a-f-]{36})' place ([0-9]+) at ([0-9.]+)/;
  private static readonly GameJoiningPrivateServerPattern = /"accessCode":"([0-9a-f-]{36})"/;
  private static readonly GameJoiningUniversePattern = /userid:(?<userid>\d+).*universeid:(?<universeid>\d+)/i;
  private static readonly GameJoiningUDMUXPattern =
    /UDMUX Address = ([0-9.]+), Port = [0-9]+ \| RCC Server Address = ([0-9.]+), Port = [0-9]+/;
  private static readonly GameJoinedEntryPattern = /serverId: ([0-9.]+)\|[0-9]+/;
  private static readonly GameMessageEntryPattern = /\[BloxstrapRPC\] (.*)/;
  private static readonly LogLinePattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z),[\d.]+,[0-9a-f]+,\d+ (.*)$/;

  private inGame: boolean = false;
  private data: ActivityData = {
    PlaceId: 0,
    JobId: "",
    MachineAddress: "",
  };
  private history: ActivityData[] = [];

  private logDirectory: string;
  private logLocation?: string;

  private teleportMarker: boolean = false;
  private reservedTeleportMarker: boolean = false;

  constructor(logFile?: string) {
    this.logDirectory = join(homedir(), "Library", "Logs", "Roblox");

    if (logFile && logFile.trim() !== "") {
      this.logLocation = logFile;
    } else {
      this.switchToLatestLogFile();
    }
  }

  private switchToLatestLogFile(): void {
    if (!existsSync(this.logDirectory)) {
      return;
    }

    let files: string[] = [];
    try {
      files = readdirSync(this.logDirectory);
    } catch (err) {
      return;
    }

    const logFiles = files
      .filter((file: string) => extname(file).toLowerCase() === ".log")
      .filter((file: string) => {
        const pattern = /^[0-9.]+_\d{8}T\d{6}Z_Player_[a-zA-Z0-9]+_last\.log$/;
        return pattern.test(file);
      })
      .map((file: string) => {
        const fullPath: string = join(this.logDirectory, file);
        let stats: Stats;
        try {
          stats = statSync(fullPath);
        } catch (err) {
          return null;
        }
        return {
          name: file,
          time: stats.mtime,
          path: fullPath,
        };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b!.time.getTime() - a!.time.getTime());

    if (logFiles.length === 0) {
      return;
    }

    const latestLogFile = logFiles[0];
    this.logLocation = latestLogFile!.path;
  }

  private readLogEntries(): void {
    if (!this.logLocation) {
      this.switchToLatestLogFile();
      if (!this.logLocation) return;
    }

    let logContent: string;
    try {
      logContent = readFileSync(this.logLocation, "utf8");
    } catch (err) {
      return;
    }

    const logLines = logContent.split(/\r?\n/);

    for (const line of logLines) {
      this.readLogEntry(line);
    }
  }

  private readLogEntry(entry: string): void {
    const matchLine = entry.match(LogMonitor.LogLinePattern);
    if (!matchLine || matchLine.length !== 3) {
      return;
    }

    const timestampStr = matchLine[1];
    const lineContent = matchLine[2];

    const logTimestamp = new Date(timestampStr);

    if (lineContent.includes(LogMonitor.GameLeavingEntry)) {
      if (this.data.PlaceId !== 0 && !this.inGame) {
        this.data = {
          PlaceId: 0,
          JobId: "",
          MachineAddress: "",
        };
      }
      return;
    }

    if (!this.inGame && this.data.PlaceId === 0) {
      if (lineContent.includes(LogMonitor.GameJoiningPrivateServerEntry)) {
        this.data.ServerType = ServerType.Private;

        const match: RegExpMatchArray | null = lineContent.match(LogMonitor.GameJoiningPrivateServerPattern);
        if (match && match[1]) {
          this.data.AccessCode = match[1];
        }
        return;
      }

      if (lineContent.includes(LogMonitor.GameJoiningEntry)) {
        const match: RegExpMatchArray | null = lineContent.match(LogMonitor.GameJoiningEntryPattern);
        if (match && match.length === 4) {
          this.inGame = false;
          this.data.PlaceId = parseInt(match[2], 10);
          this.data.JobId = match[1];
          this.data.MachineAddress = match[3];

          if (this.teleportMarker) {
            this.data.IsTeleport = true;
            this.teleportMarker = false;
          }

          if (this.reservedTeleportMarker) {
            this.data.ServerType = ServerType.Reserved;
            this.reservedTeleportMarker = false;
          }
        }
        return;
      }
    } else if (!this.inGame && this.data.PlaceId !== 0) {
      if (lineContent.includes(LogMonitor.GameJoiningUniverseEntry)) {
        const match = lineContent.match(LogMonitor.GameJoiningUniversePattern);
        if (match && match.groups) {
          this.data.UserId = parseInt(match.groups.userid, 10);
          this.data.UniverseId = parseInt(match.groups.universeid, 10);
        }
        return;
      }

      if (lineContent.includes(LogMonitor.GameJoiningUDMUXEntry)) {
        const match: RegExpMatchArray | null = lineContent.match(LogMonitor.GameJoiningUDMUXPattern);
        if (match && match.length === 3 && match[2] === this.data.MachineAddress) {
          this.data.MachineAddress = match[1];
        }
        return;
      }

      if (lineContent.includes(LogMonitor.GameJoinedEntry)) {
        const match: RegExpMatchArray | null = lineContent.match(LogMonitor.GameJoinedEntryPattern);
        if (match && match.length === 2 && match[1] === this.data.MachineAddress) {
          this.inGame = true;
          this.data.TimeJoined = logTimestamp;
        }
        return;
      }
    } else if (this.inGame && this.data.PlaceId !== 0) {
      if (lineContent.includes(LogMonitor.GameDisconnectedEntry)) {
        this.data.TimeLeft = logTimestamp;
        this.history.unshift(this.data);
        this.inGame = false;
        this.data = {
          PlaceId: 0,
          JobId: "",
          MachineAddress: "",
        };
        return;
      }

      if (lineContent.includes(LogMonitor.GameTeleportingEntry)) {
        this.teleportMarker = true;
        return;
      }

      if (lineContent.includes(LogMonitor.GameJoiningReservedServerEntry)) {
        this.teleportMarker = true;
        this.reservedTeleportMarker = true;
        return;
      }

      if (lineContent.includes(LogMonitor.GameMessageEntry)) {
        const match: RegExpMatchArray | null = lineContent.match(LogMonitor.GameMessageEntryPattern);
        if (match && match.length === 2) {
          const messagePlain: string = match[1];

          let message: Message | null = null;

          try {
            message = JSON.parse(messagePlain) as Message;
          } catch (error) {
            return;
          }

          if (!message || !message.Command) {
            return;
          }

          if (message.Command === "SetLaunchData") {
            try {
              const data: string = JSON.parse(message.Data);
              if (data.length > 200) {
                return;
              }
              this.data.RPCLaunchData = data;
            } catch (error) {
              return;
            }
          }
        }
        return;
      }
    }
  }

  public getGamePlaying(): ActivityData | null {
    this.readLogEntries();
    return this.inGame ? this.data : null;
  }

  public getHistory(): ActivityData[] {
    return this.history;
  }

  public isInGame(): boolean {
    this.readLogEntries();
    return this.inGame;
  }

  public getCurrentActivity(): ActivityData {
    this.readLogEntries();
    return this.data;
  }
}
