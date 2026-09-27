import { saveNamedPort } from "../utilities/namedPortStore";

type Input = {
  /** The TCP port whose saved name should change. */
  port: number;
  /** The new nonempty name. */
  name: string;
};

/** Update the name of a port that is already saved in Named Ports. */
export default function tool({ port, name }: Input) {
  return saveNamedPort(port, name, "update");
}
