import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="5153b247-e459-42be-89aa-95f8476c1faf" quickSearch={props.arguments?.search} />;
}
