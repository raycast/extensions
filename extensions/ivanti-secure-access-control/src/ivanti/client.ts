import { connectionStoreExists, CONNECTION_STORE_PATH, readConfiguredConnections } from "./connstore";
import { isIvantiInstalled, IVANTI_APP_PATH, listConnectionStates, runTrayConnectionCommand } from "./applescript";
import { IvantiConnection, IvantiConnectionOverview, IvantiConnectionState, IvantiConnectionStatus } from "./types";

export type IvantiToggleAction = "connect" | "disconnect";
const CONNECTION_POLL_INTERVAL_MS = 500;
const CONNECTION_SWITCH_TIMEOUT_MS = 15000;

export async function loadConnectionOverview(): Promise<IvantiConnectionOverview> {
  const [appInstalled, storeFound] = await Promise.all([isIvantiInstalled(), connectionStoreExists()]);
  const configuredConnections = storeFound ? await readConfiguredConnections() : [];

  let statusSupported = false;
  let statusError: string | undefined;
  let mergedConnections = configuredConnections;

  if (appInstalled) {
    try {
      const states = await listConnectionStates();
      if (states.length > 0) {
        statusSupported = true;
        mergedConnections = mergeStates(configuredConnections, states);
      }
    } catch (error) {
      statusError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    appInstalled,
    appPath: IVANTI_APP_PATH,
    connectionStoreFound: storeFound,
    connectionStorePath: CONNECTION_STORE_PATH,
    connections: mergedConnections,
    statusError,
    statusSupported,
  };
}

async function connectConnection(connection: IvantiConnection): Promise<void> {
  await disconnectOtherActiveConnections(connection);
  await runTrayConnectionCommand(connection.name, "connect");
}

async function disconnectConnection(connection: IvantiConnection): Promise<void> {
  await runTrayConnectionCommand(connection.name, "disconnect");
}

export async function toggleConnection(connection: IvantiConnection): Promise<void> {
  const action = getToggleAction(connection);
  if (action === "disconnect") {
    await disconnectConnection(connection);
    return;
  }

  await connectConnection(connection);
}

export function getToggleAction(connection: IvantiConnection): IvantiToggleAction {
  if (
    connection.status === "connected" ||
    connection.status === "connecting" ||
    connection.status === "disconnecting"
  ) {
    return "disconnect";
  }

  if (connection.buttonTitle) {
    const normalizedButtonTitle = normalize(connection.buttonTitle);
    if (isDisconnectLabel(normalizedButtonTitle)) {
      return "disconnect";
    }

    if (isConnectLabel(normalizedButtonTitle)) {
      return "connect";
    }
  }

  return "connect";
}

export function getDisplayStatus(connection: IvantiConnection): string {
  if (connection.status !== "unknown") {
    return capitalize(connection.status);
  }

  if (connection.buttonTitle) {
    // Older or partially accessible UI states may only expose the button label.
    const action = getToggleAction(connection);
    return action === "disconnect" ? "Connected" : "Disconnected";
  }

  return "Unknown";
}

function mergeStates(configuredConnections: IvantiConnection[], states: IvantiConnectionState[]): IvantiConnection[] {
  const remainingStates = [...states];

  return configuredConnections.map((connection) => {
    const state = takeMatchingState(remainingStates, connection);
    if (!state) {
      return connection;
    }

    return {
      ...connection,
      buttonTitle: state.buttonTitle,
      status: normalizeStatus(state.status),
    };
  });
}

function normalizeStatus(status: string): IvantiConnectionStatus {
  const normalized = normalize(status);
  if (normalized.includes("disconnecting") || normalized.includes("正在断开") || normalized.includes("请求断开")) {
    return "disconnecting";
  }

  if (normalized.includes("disconnected") || normalized.includes("已断开")) {
    return "disconnected";
  }

  if (
    normalized.includes("connecting") ||
    normalized.includes("reconnecting") ||
    normalized.includes("正在连接") ||
    normalized.includes("等待连接") ||
    normalized.includes("请求连接")
  ) {
    return "connecting";
  }

  if (normalized.includes("connected") || normalized.includes("已连接") || normalized.includes("连接完成")) {
    return "connected";
  }

  return "unknown";
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function takeMatchingState(
  states: IvantiConnectionState[],
  connection: IvantiConnection,
): IvantiConnectionState | undefined {
  return (
    takeFirstMatchingState(
      states,
      (state) =>
        normalize(state.uri) === normalize(connection.uri) && normalize(state.name) === normalize(connection.name),
    ) ??
    takeUniqueMatchingState(states, (state) => normalize(state.uri) === normalize(connection.uri)) ??
    takeUniqueMatchingState(states, (state) => normalize(state.name) === normalize(connection.name))
  );
}

function takeUniqueMatchingState(
  states: IvantiConnectionState[],
  predicate: (state: IvantiConnectionState) => boolean,
): IvantiConnectionState | undefined {
  const matches = states.filter(predicate);
  if (matches.length !== 1) {
    return undefined;
  }

  return takeFirstMatchingState(states, predicate);
}

function takeFirstMatchingState(
  states: IvantiConnectionState[],
  predicate: (state: IvantiConnectionState) => boolean,
): IvantiConnectionState | undefined {
  const index = states.findIndex(predicate);
  if (index < 0) {
    return undefined;
  }

  const [state] = states.splice(index, 1);
  return state;
}

async function disconnectOtherActiveConnections(targetConnection: IvantiConnection): Promise<void> {
  const states = await listConnectionStates();
  const activeStates = states.filter((state) => {
    if (isSameConnection(state, targetConnection)) {
      return false;
    }

    return isActiveState(state);
  });

  for (const state of activeStates) {
    await runTrayConnectionCommand(state.name, "disconnect");
  }

  if (activeStates.length > 0) {
    await waitForConnectionsToDrain(targetConnection);
  }
}

async function waitForConnectionsToDrain(targetConnection: IvantiConnection): Promise<void> {
  const deadline = Date.now() + CONNECTION_SWITCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await delay(CONNECTION_POLL_INTERVAL_MS);
    const states = await listConnectionStates();
    const hasOtherActiveConnections = states.some(
      (state) => !isSameConnection(state, targetConnection) && isActiveState(state),
    );

    if (!hasOtherActiveConnections) {
      return;
    }
  }

  throw new Error("Another Ivanti connection is still active. Disconnect it first, then retry.");
}

function isSameConnection(state: IvantiConnectionState, connection: IvantiConnection): boolean {
  const normalizedStateName = normalize(state.name);
  const normalizedConnectionName = normalize(connection.name);
  const normalizedStateUri = normalize(state.uri);
  const normalizedConnectionUri = normalize(connection.uri);

  const hasName = normalizedStateName.length > 0 && normalizedConnectionName.length > 0;
  const hasUri = normalizedStateUri.length > 0 && normalizedConnectionUri.length > 0;
  const sameName = hasName && normalizedStateName === normalizedConnectionName;
  const sameUri = hasUri && normalizedStateUri === normalizedConnectionUri;

  if (hasName && hasUri) {
    return sameName && sameUri;
  }

  if (hasUri) {
    return sameUri;
  }

  if (hasName) {
    return sameName;
  }

  return false;
}

function isActiveState(state: IvantiConnectionState): boolean {
  const status = normalizeStatus(state.status);
  if (status === "connected" || status === "connecting" || status === "disconnecting") {
    return true;
  }

  const buttonTitle = normalize(state.buttonTitle);
  return isDisconnectLabel(buttonTitle);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDisconnectLabel(value: string): boolean {
  return value.includes("disconnect") || value.includes("断开");
}

function isConnectLabel(value: string): boolean {
  return value.includes("connect") || value.includes("连接");
}
