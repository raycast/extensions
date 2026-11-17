import { createExecutor, findM1ddc, M1ddc, M1ddcNotFoundError, controls, valueAtPercentage } from "./m1ddc";
import type { Control, Display, DisplayState, Execute, Reading } from "./m1ddc";

export type Monitor = Display & { builtIn: boolean; ddc: boolean };
export type Discovery = { monitors: Monitor[]; m1ddcMissing: boolean; warning?: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "This display control is unavailable.";
}

function unavailable(message: string): DisplayState {
  return { volume: { error: message }, luminance: { error: message }, contrast: { error: message } };
}

export class MonitorService {
  private ddc?: M1ddc;
  private pending: Promise<unknown> = Promise.resolve();
  private states = new Map<string, DisplayState>();

  constructor(
    private readonly native: Execute,
    private readonly customPath?: string,
    private readonly externalClient = async () => {
      if (process.arch !== "arm64")
        throw new Error("m1ddc requires Apple Silicon. Built-in display controls remain available.");
      return new M1ddc(createExecutor(await findM1ddc(this.customPath)));
    },
  ) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    // Keep a complete read or write together, including when the selected display changes.
    const result = this.pending.then(operation);
    this.pending = result.catch(() => undefined);
    return result;
  }

  getState(id: string): DisplayState | undefined {
    return this.states.get(id.toLowerCase());
  }

  discover(): Promise<Discovery> {
    return this.enqueue(() => this.discoverDisplays());
  }

  private async discoverDisplays(): Promise<Discovery> {
    await this.ddc?.waitForIdle();
    let nativeDisplays: Omit<Monitor, "ddc">[] = [];
    const warnings: string[] = [];
    try {
      nativeDisplays = JSON.parse(await this.native(["list"]));
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
    const connected = new Set(monitors.map((monitor) => monitor.id.toLowerCase()));
    for (const id of this.states.keys()) {
      if (!connected.has(id)) this.states.delete(id);
    }
    return { monitors, m1ddcMissing, warning: warnings.length ? warnings.join("\n\n") : undefined };
  }

  private async nativeReading(args: string[], signal?: AbortSignal): Promise<Reading> {
    const reading: Reading = JSON.parse(await this.native(args, signal));
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

  readControls(monitor: Monitor, signal?: AbortSignal): Promise<DisplayState> {
    return this.enqueue(async () => {
      signal?.throwIfAborted();
      const state = await this.readMonitor(monitor, signal);
      signal?.throwIfAborted();
      const previous = this.getState(monitor.id);
      for (const control of controls) {
        if (!state[control].reading && previous?.[control].reading) {
          state[control] = { ...state[control], reading: previous[control].reading };
        }
      }
      this.states.set(monitor.id.toLowerCase(), state);
      return state;
    });
  }

  private async readMonitor(monitor: Monitor, signal?: AbortSignal): Promise<DisplayState> {
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

  private update(monitor: Monitor, control: Control, operation: () => Promise<Reading>): Promise<Reading> {
    return this.enqueue(async () => {
      const state = this.getState(monitor.id) ?? unavailable("This control has not been read yet.");
      try {
        const reading = await operation();
        this.states.set(monitor.id.toLowerCase(), { ...state, [control]: { reading } });
        return reading;
      } catch (error) {
        this.states.set(monitor.id.toLowerCase(), {
          ...state,
          [control]: { ...state[control], error: errorMessage(error) },
        });
        throw error;
      }
    });
  }

  adjust(monitor: Monitor, control: Control, direction: -1 | 1, step: number): Promise<Reading> {
    return this.update(monitor, control, async () => {
      if (monitor.builtIn) {
        if (control === "contrast") throw new Error("The built-in display does not support contrast control.");
        return this.nativeReading(["adjust", monitor.id, control, String(direction * step)]);
      }
      if (!monitor.ddc || !this.ddc) throw new Error("This display is unavailable through m1ddc.");
      return this.ddc.adjust(monitor.id, control, direction, step);
    });
  }

  async set(monitor: Monitor, control: Control, percent: number): Promise<Reading> {
    valueAtPercentage(percent, 100);
    return this.update(monitor, control, async () => {
      if (monitor.builtIn) {
        if (control === "contrast") throw new Error("The built-in display does not support contrast control.");
        return this.nativeReading(["set", monitor.id, control, String(percent)]);
      }
      if (!monitor.ddc || !this.ddc) throw new Error("This display is unavailable through m1ddc.");
      return this.ddc.set(monitor.id, control, percent);
    });
  }
}
