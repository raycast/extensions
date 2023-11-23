import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="658f6845-f675-4c91-b39a-cf92bbe8f7be" quickSearch={props.arguments?.search} />;
}
