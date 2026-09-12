import { entrypoint, getInput, setOutput } from "../lib/utils";
import bcrypt from "bcryptjs";

export default entrypoint(async () => {
  const contents = await getInput();
  const saltRounds = 10;
  const hash = bcrypt.hashSync(contents.toString(), saltRounds);

  await setOutput(hash, "Created Bcrypt Hash");
});
