import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="885d77e7-300b-4713-8755-6b5f69fc1ac0" quickSearch={props.arguments?.search} />;
}
