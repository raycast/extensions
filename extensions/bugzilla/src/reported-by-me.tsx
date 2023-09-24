import { FetchBugs } from "./components/bugs";

export default function Command(): JSX.Element {
  return <FetchBugs navigationTitle="Open Bugs Assigned To Me" currentUserSearchParam="creator" />;
}
