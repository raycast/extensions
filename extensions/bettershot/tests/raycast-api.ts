import { vi } from "vitest";

export const closeMainWindow = vi.fn().mockResolvedValue(undefined);
export const open = vi.fn().mockResolvedValue(undefined);
export const showHUD = vi.fn().mockResolvedValue(undefined);
