import { EntryList } from "./components/EntryList";
import { FeedbinApiContextProvider } from "./utils/FeedbinApiContext";

export default function Command(): JSX.Element {
  return (
    <FeedbinApiContextProvider starred>
      <EntryList />
    </FeedbinApiContextProvider>
  );
}
