import { LaunchProps } from "@raycast/api";
import { CreateObjectForm, EnsureAuthenticated } from "./components";
import { PropertyFieldValue } from "./models";
export interface CreateObjectFormValues {
  spaceId?: string;
  typeId?: string;
  templateId?: string;
  listId?: string;
  name?: string;
  icon?: string;
  description?: string;
  body?: string;
  source?: string;

  /**
   * Dynamic property values coming from the selected Type definition.
   * Keys are the property `key` strings and values depend on the property format:
   * - "text" & "select"  -> string
   * - "number"           -> string (raw text input before cast)
   * - "date"             -> Date | null (Raycast DatePicker returns a Date object)
   * - "multi_select"     -> string[]
   * - "checkbox"         -> boolean
   */
  [key: string]: PropertyFieldValue;
}

interface LaunchContext {
  defaults: {
    space: string;
    type: string;
    template: string;
    list: string;
    name: string;
    icon: string;
    description: string;
    body: string;
    source: string;
  };
}

interface CreateObjectProps
  extends LaunchProps<{ draftValues?: CreateObjectFormValues; launchContext?: LaunchContext }> {}

export default function Command(props: CreateObjectProps) {
  return (
    <EnsureAuthenticated viewType="form">
      <CreateObject {...props} />
    </EnsureAuthenticated>
  );
}

function CreateObject({ draftValues, launchContext }: CreateObjectProps) {
  const mergedValues = {
    ...launchContext?.defaults,
    ...draftValues, // `draftValues` takes precedence
  };

  return <CreateObjectForm draftValues={mergedValues} enableDrafts={true} />;
}
