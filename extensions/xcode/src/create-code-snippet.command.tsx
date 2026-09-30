import { XcodeCodeSnippetForm } from "./components/xcode-code-snippet/xcode-code-snippet-form.component";
import { XcodeCodeSnippetFormValues } from "./models/xcode-code-snippet/xcode-code-snippet-form-values.model";
import { LaunchProps } from "@raycast/api";

export default (props: LaunchProps<{ draftValues: XcodeCodeSnippetFormValues }>) => (
  <XcodeCodeSnippetForm draftValues={props.draftValues} />
);
