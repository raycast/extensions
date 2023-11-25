import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="92739c0f-d742-4e9b-b1fc-1cd5c939cbd2" quickSearch={props.arguments?.search} />;
}
