/**
 * Unit registry — maps a single-character suffix to a numeric multiplier.
 *
 * Designed as a plugin point: callers can register new units (e.g. "h" for
 * hours expressed in seconds, "g" for giga-) without touching the tokenizer.
 */
export interface UnitRegistry {
  get(suffix: string): number | undefined;
  register(suffix: string, multiplier: number): void;
  has(suffix: string): boolean;
}

class DefaultUnitRegistry implements UnitRegistry {
  private readonly units = new Map<string, number>();

  register(suffix: string, multiplier: number): void {
    if ([...suffix].length !== 1) {
      throw new Error(`Unit suffix must be a single character, got "${suffix}"`);
    }
    this.units.set(suffix.toLowerCase(), multiplier);
  }

  get(suffix: string): number | undefined {
    return this.units.get(suffix.toLowerCase());
  }

  has(suffix: string): boolean {
    return this.units.has(suffix.toLowerCase());
  }
}

export function createUnitRegistry(): UnitRegistry {
  const registry = new DefaultUnitRegistry();
  registry.register("k", 1_000);
  registry.register("к", 1_000);
  registry.register("m", 1_000_000);
  registry.register("м", 1_000_000);
  registry.register("b", 1_000_000_000);
  registry.register("б", 1_000_000_000);
  return registry;
}

export const defaultUnits: UnitRegistry = createUnitRegistry();
