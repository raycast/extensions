export class ConnectionRequired extends Error {
  constructor(message = "Connect a local status-line integration to show Claude Code limits.") {
    super(message);
    this.name = "ConnectionRequired";
  }
}

export class BridgeConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BridgeConflict";
  }
}

export class BridgeWaiting extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BridgeWaiting";
  }
}
