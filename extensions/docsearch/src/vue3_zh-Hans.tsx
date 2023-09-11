import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="e9654353-3f1f-4970-ba87-04483158ff12" quickSearch={props.arguments?.search} />;
}
