import { vi, type Mock } from "vitest";
import type { Toast } from "@raycast/api";

export const showFailureToast: Mock<
  (error: unknown, options?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>) => Promise<Toast>
> = vi.fn(async (error, options) => ({
  style: 2,
  title: options?.title || "",
  message: options?.message,
  hide: vi.fn(),
  show: vi.fn(),
  id: "",
  options: { style: 2, title: options?.title || "" },
  callbacks: {},
})) as unknown as Mock<
  (error: unknown, options?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>) => Promise<Toast>
>;
