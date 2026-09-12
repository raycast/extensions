import { useNavigation } from "@raycast/api";
import "./fetchPolyfill";
import { SearchForm } from "./search/SearchForm";
import { SearchResultsList } from "./search/SearchResultsList";
import { SearchFormValues } from "./search/types";

export default function SearchCommand() {
  const { push } = useNavigation();

  const handleSubmit = (values: SearchFormValues) => push(<SearchResultsList values={values} />);

  return <SearchForm onSubmit={handleSubmit} />;
}
