import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="f49f3a04-fb3d-4f42-a527-de073e409e2b" quickSearch={props.arguments?.search} />;
}
