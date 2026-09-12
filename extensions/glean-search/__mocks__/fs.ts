import { vi } from "vitest";

export const accessSync = vi.fn();
export const readFileSync = vi.fn();
export const writeFileSync = vi.fn();
export const unlinkSync = vi.fn();
export const existsSync = vi.fn();
export const mkdirSync = vi.fn();
export const createReadStream = vi.fn(() => ({
  on: vi.fn(),
  pipe: vi.fn(),
}));
export const createWriteStream = vi.fn(() => ({
  on: vi.fn(),
  close: vi.fn(),
}));

export const constants = {
  F_OK: 0,
  X_OK: 1,
  W_OK: 2,
  R_OK: 4,
};
