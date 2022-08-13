import Splitwise from "splitwise";
import { getPreferences } from "./preference";

const { consumerKey, consumerSecret } = getPreferences();

export const splitwise = Splitwise({
  consumerKey,
  consumerSecret,
});

export default splitwise;
