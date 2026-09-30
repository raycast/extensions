import Site from "./site";

export default interface State {
  sites?: Site[];
  error?: Error;
}
