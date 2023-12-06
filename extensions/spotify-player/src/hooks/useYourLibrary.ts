import { YourLibrary } from "../helpers/YourLibrary";

export function useYourLibrary(): YourLibrary {
  return YourLibrary.getInstance();
}
