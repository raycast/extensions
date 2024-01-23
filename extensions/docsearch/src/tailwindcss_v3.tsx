import { SearchDocumentation } from "./components";

export default function Command(props: { arguments: { search?: string } }) {
  return <SearchDocumentation id="a27a6445-8265-4c59-b08e-ce53474c0b8c" quickSearch={props.arguments?.search} />;
}
