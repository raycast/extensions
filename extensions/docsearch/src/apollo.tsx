import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="48dd6e88-fd12-4e55-8d0d-e9c2982ba924" quickSearch={props.arguments?.search} />;
}
