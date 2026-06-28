import { EntryList } from "./components/EntryList";
import { FeedbinApiContextProvider } from "./utils/FeedbinApiContext";

export default function Command() {
  return (
    <FeedbinApiContextProvider>
      <EntryList />
    </FeedbinApiContextProvider>
  );
}
