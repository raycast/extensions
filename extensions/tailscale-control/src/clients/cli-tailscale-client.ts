import { runExecFile } from "../lib/command-runner";
import { TailscaleCommandError } from "../lib/errors";
import {
  isNoExitNodesOutput,
  parseExitNodeList,
  parseNetcheckOutput,
  parsePingOutput,
  parsePrefsOutput,
  parseServiceStatusOutput,
  parseStatusOutput,
} from "../lib/parsers";
import { ConflictBehavior, DashboardState, NetcheckResult, PingResult } from "../types";
import { TailscaleClient } from "./tailscale-client";

type CommandRunner = typeof runExecFile;

export class CliTailscaleClient implements TailscaleClient {
  constructor(
    private readonly binaryPath: string,
    private readonly commandRunner: CommandRunner = runExecFile,
  ) {}

  async getDashboardState(): Promise<DashboardState> {
    const [statusResult, exitNodeOutput, prefsResult, serveResult, funnelResult] = await Promise.all([
      this.run(["status", "--json"]),
      this.getExitNodeOutput(),
      this.tryRun(["debug", "prefs"]),
      this.tryRun(["serve", "status", "--json"]),
      this.tryRun(["funnel", "status", "--json"]),
    ]);
    const state = parseStatusOutput(statusResult.stdout);

    return {
      ...state,
      exitNodes: parseExitNodeList(exitNodeOutput, state.peers, state.self?.currentExitNodeId),
      settings: prefsResult ? parsePrefsOutput(prefsResult.stdout) : undefined,
      serveStatus: parseServiceStatusOutput("serve", serveResult?.stdout),
      funnelStatus: parseServiceStatusOutput("funnel", funnelResult?.stdout),
    };
  }

  async connect(): Promise<void> {
    await this.run(["up"]);
  }

  async disconnect(): Promise<void> {
    await this.run(["down"]);
  }

  async setExitNode(exitNodeId: string): Promise<void> {
    await this.run(["set", `--exit-node=${exitNodeId}`]);
  }

  async clearExitNode(): Promise<void> {
    await this.run(["set", "--exit-node="]);
  }

  async pingPeer(peerIdentifier: string): Promise<PingResult> {
    const result = await this.run(["ping", peerIdentifier]);
    return parsePingOutput(result.stdout);
  }

  async runNetcheck(): Promise<NetcheckResult> {
    const result = await this.run(["netcheck"]);
    return parseNetcheckOutput(result.stdout, new Date().toISOString());
  }

  async setAcceptDns(enabled: boolean): Promise<void> {
    await this.run(["set", `--accept-dns=${enabled}`]);
  }

  async setAcceptRoutes(enabled: boolean): Promise<void> {
    await this.run(["set", `--accept-routes=${enabled}`]);
  }

  async setSsh(enabled: boolean): Promise<void> {
    await this.run(["set", `--ssh=${enabled}`]);
  }

  async setWebClient(enabled: boolean): Promise<void> {
    await this.run(["set", `--webclient=${enabled}`]);
  }

  async setShieldsUp(enabled: boolean): Promise<void> {
    await this.run(["set", `--shields-up=${enabled}`]);
  }

  async setExitNodeLanAccess(enabled: boolean): Promise<void> {
    await this.run(["set", `--exit-node-allow-lan-access=${enabled}`]);
  }

  async sendFiles(target: string, files: string[]): Promise<void> {
    await this.run(["file", "cp", ...files, `${target.replace(/:$/, "")}:`]);
  }

  async receiveFiles(directory: string, conflict: ConflictBehavior): Promise<void> {
    await this.run(["file", "get", `--conflict=${conflict}`, directory]);
  }

  async configureServe(target: string, path?: string): Promise<void> {
    const args = ["serve", "--bg", "--yes"];
    if (path) {
      args.push("--set-path", path);
    }
    args.push(target);
    await this.run(args);
  }

  async resetServe(): Promise<void> {
    await this.run(["serve", "reset"]);
  }

  async configureFunnel(target: string, path?: string): Promise<void> {
    const args = ["funnel", "--bg", "--yes"];
    if (path) {
      args.push("--set-path", path);
    }
    args.push(target);
    await this.run(args);
  }

  async resetFunnel(): Promise<void> {
    await this.run(["funnel", "reset"]);
  }

  private async getExitNodeOutput(): Promise<string> {
    try {
      const result = await this.run(["exit-node", "list"]);
      return result.stdout;
    } catch (error) {
      if (
        error instanceof TailscaleCommandError &&
        error.exitCode === 1 &&
        (isNoExitNodesOutput(error.stdout) || isNoExitNodesOutput(error.stderr))
      ) {
        return "";
      }

      throw error;
    }
  }

  private async run(args: string[]) {
    return this.commandRunner(this.binaryPath, args);
  }

  private async tryRun(args: string[]) {
    try {
      return await this.run(args);
    } catch {
      return null;
    }
  }
}
