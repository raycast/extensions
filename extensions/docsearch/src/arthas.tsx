import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="138055c4-5959-4f0a-bd9b-d8df8ff7cf9b" quickSearch={props.arguments?.search} />;
}
