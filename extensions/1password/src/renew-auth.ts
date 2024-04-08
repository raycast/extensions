import { op } from "./v8/utils";

export default async function renewAuth() {
  try {
    op(["account", "get"]);
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  }
}
