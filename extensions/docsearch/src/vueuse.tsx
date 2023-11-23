import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="41a892ff-2faf-4d17-9f28-2c43b8a1899c" quickSearch={props.arguments?.search} />;
}
