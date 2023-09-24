import { FetchBugs } from "./components/bugs";

export default function Command(): JSX.Element {
  return <FetchBugs navigationTitle="My CC Bugs" currentUserSearchParam="cc" />;
}
