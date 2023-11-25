import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="bd744296-9bed-4ae2-86b6-0fa2ddac45fd" quickSearch={props.arguments?.search} />;
}
