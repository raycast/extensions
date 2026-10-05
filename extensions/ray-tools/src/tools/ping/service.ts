import { diagnosePing } from "./domain";
import type { PingProvider, PingResult } from "./types";

export class PingService {
  constructor(
    private readonly provider: PingProvider,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async check(): Promise<PingResult> {
    const probes = await this.provider.check();

    return {
      ...probes,
      checkedAt: this.clock().toISOString(),
      diagnosis: diagnosePing(probes),
    };
  }
}
