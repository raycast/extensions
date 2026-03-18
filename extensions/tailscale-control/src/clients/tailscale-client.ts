import { ConflictBehavior, DashboardState, NetcheckResult, PingResult } from "../types";

export interface TailscaleClient {
  getDashboardState(): Promise<DashboardState>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setExitNode(exitNodeId: string): Promise<void>;
  clearExitNode(): Promise<void>;
  pingPeer(peerIdentifier: string): Promise<PingResult>;
  runNetcheck(): Promise<NetcheckResult>;
  setAcceptDns(enabled: boolean): Promise<void>;
  setAcceptRoutes(enabled: boolean): Promise<void>;
  setSsh(enabled: boolean): Promise<void>;
  setWebClient(enabled: boolean): Promise<void>;
  setShieldsUp(enabled: boolean): Promise<void>;
  setExitNodeLanAccess(enabled: boolean): Promise<void>;
  sendFiles(target: string, files: string[]): Promise<void>;
  receiveFiles(directory: string, conflict: ConflictBehavior): Promise<void>;
  configureServe(target: string, path?: string): Promise<void>;
  resetServe(): Promise<void>;
  configureFunnel(target: string, path?: string): Promise<void>;
  resetFunnel(): Promise<void>;
}
