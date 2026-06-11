import { calAPI } from "@api/cal.com";

// eslint-disable-next-line @typescript-eslint/ban-types
type Input = {};

/** List connected conferencing apps (Zoom, Google Meet, etc.). */
export default async function tool(input: Input): Promise<unknown> {
  void input;
  return calAPI({ url: "/conferencing" });
}
