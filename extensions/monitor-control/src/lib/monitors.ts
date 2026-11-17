import { createExecutor, findM1ddc, M1ddc, M1ddcNotFoundError, controls, valueAtPercentage } from "./m1ddc";
import type { Control, Display, DisplayState, Execute, Reading } from "./m1ddc";

export type Monitor = Display & { builtIn: boolean; ddc: boolean };
export type Discovery = { monitors: Monitor[]; m1ddcMissing: boolean; warning?: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The monitor control is unavailable.";
}

function unavailable(message: string): DisplayState {
  return { volume: { error: message }, luminance: { error: message }, contrast: { error: message } };
}

export class MonitorService {
  private ddc?: M1ddc;
  private pendingNative: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly native: Execute,
    private readonly customPath?: string,
    private readonly externalClient = async () => {
      if (process.arch !== "arm64")
        throw new Error("m1ddc requires Apple Silicon. Built-in display controls remain available.");
      return new M1ddc(createExecutor(await findM1ddc(this.customPath)));
    },
  ) {}

  private runNative(args: string[], signal?: AbortSignal): Promise<string> {
    const result = this.pendingNative.then(() => {
      signal?.throwIfAborted();
      return this.native(args, signal);
    });
    this.pendingNative = result.catch(() => undefined);
    return result;
  }

  async discover(): Promise<Discovery> {
    await this.ddc?.waitForIdle();
    let nativeDisplays: Omit<Monitor, "ddc">[] = [];
    const warnings: string[] = [];
    try {
      nativeDisplays = JSON.parse(await this.runNative(["list"]));
    } catch (error) {
      warnings.push(errorMessage(error));
    }
    let external: Display[] = [];
    let m1ddcMissing = false;
    this.ddc = undefined;
    try {
      this.ddc = await this.externalClient();
      external = await this.ddc.listDisplays();
    } catch (error) {
      m1ddcMissing = error instanceof M1ddcNotFoundError;
      warnings.push(errorMessage(error));
    }
    const monitors = nativeDisplays.map((display) => ({
      ...display,
      ddc: !display.builtIn && external.some((item) => item.id.toLowerCase() === display.id.toLowerCase()),
    }));
    for (const display of external) {
      if (!monitors.some((item) => item.id.toLowerCase() === display.id.toLowerCase())) {
        monitors.push({ ...display, builtIn: false, ddc: true });
      }
    }
    return { monitors, m1ddcMissing, warning: warnings.length ? warnings.join("\n\n") : undefined };
  }

  private async nativeReading(args: string[], signal?: AbortSignal): Promise<Reading> {
    const reading: Reading = JSON.parse(await this.runNative(args, signal));
    if (
      !Number.isFinite(reading.current) ||
      reading.maximum !== 100 ||
      reading.current < 0 ||
      reading.current > reading.maximum
    ) {
      throw new Error("macOS returned an invalid value for this control.");
    }
    return reading;
  }

  async readControls(monitor: Monitor, signal?: AbortSignal): Promise<DisplayState> {
    if (!monitor.builtIn) {
      return monitor.ddc && this.ddc
        ? this.ddc.readControls(monitor.id, signal)
        : unavailable(
            "This display is not available through m1ddc. Check DDC/CI, your connection, and m1ddc installation.",
          );
    }
    const state = unavailable("macOS does not expose contrast control for the built-in display.");
    for (const control of controls.filter((item) => item !== "contrast")) {
      signal?.throwIfAborted();
      try {
        state[control] = { reading: await this.nativeReading(["read", monitor.id, control], signal) };
      } catch (error) {
        signal?.throwIfAborted();
        state[control] = { error: errorMessage(error) };
      }
    }
    return state;
  }

  async adjust(monitor: Monitor, control: Control, direction: -1 | 1, step: number): Promise<Reading> {
    if (monitor.builtIn) {
      if (control === "contrast") throw new Error("The built-in display does not support contrast control.");
      return this.nativeReading(["adjust", monitor.id, control, String(direction * step)]);
    }
    if (!monitor.ddc || !this.ddc) throw new Error("This display is unavailable through m1ddc.");
    return this.ddc.adjust(monitor.id, control, direction, step);
  }

  async set(monitor: Monitor, control: Control, percent: number): Promise<Reading> {
    valueAtPercentage(percent, 100);
    if (monitor.builtIn) {
      if (control === "contrast") throw new Error("The built-in display does not support contrast control.");
      return this.nativeReading(["set", monitor.id, control, String(percent)]);
    }
    if (!monitor.ddc || !this.ddc) throw new Error("This display is unavailable through m1ddc.");
    return this.ddc.set(monitor.id, control, percent);
  }
}
