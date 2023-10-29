import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="70d84e01-304f-4838-9ce8-63ba0c6d35cf" quickSearch={props.arguments?.search} />;
}
