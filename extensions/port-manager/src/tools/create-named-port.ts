import { saveNamedPort } from "../utilities/namedPortStore";

type Input = {
  /** The TCP port to name, from 0 to 65535. */
  port: number;
  /** A nonempty name such as Next.js. */
  name: string;
};

/** Create a named port without replacing an existing saved name. */
export default function tool({ port, name }: Input) {
  return saveNamedPort(port, name, "create");
}
