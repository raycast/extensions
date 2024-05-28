import { getSignInStatus, op } from "./v8/utils";

export default async function renewAuth() {
  try {
    if (getSignInStatus()) {
      return op(["account", "get"]);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
    }
  }
}
