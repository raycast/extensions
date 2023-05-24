import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="32a8ea32-e398-4ed1-bc99-9425afa1ad33" quickSearch={props.arguments?.search} />;
}
