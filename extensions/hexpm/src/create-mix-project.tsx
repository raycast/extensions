import { Form } from "@raycast/api";
import { useState } from "react";

const MODULE_NAME_REGEXP = /^[A-Z]\w*(\.[A-Z]\w*)*$/;
const APP_NAME_REGEXP = /^[a-z][a-z0-9_]*$/;

export default function Command() {
  const [moduleNameError, setModuleNameError] = useState<string | undefined>();
  const [appNameError, setAppNameError] = useState<string | undefined>();

  function onModuleNameBlur(event: Form.Event<string>) {
    if (!event.target.value) {
      setModuleNameError(undefined);
      return;
    }

    if (!MODULE_NAME_REGEXP.test(event.target.value)) {
      setModuleNameError(
        "Module name must start with an uppercase ASCII letter, followed by ASCII letters, numbers, or underscores, and separated by dots (for example: Foo.Bar).",
      );
    } else {
      setModuleNameError(undefined);
    }
  }

  function onAppNameBlur(event: Form.Event<string>) {
    if (!event.target.value) {
      setAppNameError(undefined);
      return;
    }

    if (!APP_NAME_REGEXP.test(event.target.value)) {
      setAppNameError(
        "Application name must start with a lowercase ASCII letter, followed by lowercase ASCII letters, numbers, or underscores (for example: my_app).",
      );
    } else {
      setAppNameError(undefined);
    }
  }

  return (
    <Form enableDrafts>
      <Form.FilePicker
        id="path"
        title="File Path"
        info="The path where the project will be created. The application name and module name will be retrieved from the path, unless Module Name or App Name is given."
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField
        id="app"
        title="App Name"
        placeholder="The app name (e.g. my_app)"
        info="App Name option can be given in order to name the OTP application for the project."
        error={appNameError}
        onBlur={onAppNameBlur}
      />
      <Form.TextField
        id="module"
        title="Module Name"
        error={moduleNameError}
        placeholder="The module name (e.g. MyApp)"
        info="Module Name option can be given in order to name the modules in the generated code skeleton."
        onBlur={onModuleNameBlur}
      />
      <Form.Checkbox
        id="sub"
        label="Add Supervision Tree"
        defaultValue={false}
        info="Add Supervision Tree option can be given to generate an OTP application skeleton including a supervision tree. Normally an app is generated without a supervisor and without the app callback."
      />
      <Form.Checkbox
        id="umbrella"
        label="As Umbrella"
        defaultValue={false}
        info="As Umbrella option can be given to generate an umbrella project."
      />
    </Form>
  );
}
