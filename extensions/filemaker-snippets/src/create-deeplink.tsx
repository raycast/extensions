import { Action, ActionPanel, Form, Icon, Clipboard, showHUD } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { SnippetWithPath, zLaunchContext } from "./utils/types";
import { z } from "zod";
import { isEmpty } from "lodash";

type ZLaunchContext = z.infer<typeof zLaunchContext>;

const deeplinkTypes = zLaunchContext.options.map((o) => o.shape.type.value);
type DeeplinkType = typeof deeplinkTypes[number];
type FormValues = {
  __type: DeeplinkType;
  __action?: Extract<ZLaunchContext, { type: "import" }>["action"];
  __url?: string;
  __showForm: "true" | "false";
};

export default function CreateDeeplinkForm({ snippet }: { snippet: SnippetWithPath }) {
  const { itemProps, handleSubmit, values, setValidationError } = useForm<FormValues>({
    onSubmit: (values) => {
      const { __showForm, __type, __action, __url, ...rest } = values;

      if (__type === "import" && urlTooLong && isEmpty(__url)) {
        setValidationError("__url", "URL is required");
        return;
      }

      const context =
        values.__type === "my"
          ? { type: "my", id: snippet.id, showForm: __showForm === "true", values: rest }
          : {
              type: "import",
              action: __action ?? "copy",
              snippet: urlTooLong ? __url ?? "" : snippet,
              showForm: __showForm === "true",
              values: rest,
            };

      Clipboard.copy(
        `raycast://extensions/eluce2/filemaker-snippets/view-snippets?context=${encodeURIComponent(
          JSON.stringify(context)
        )}`
      );
      showHUD("Copied to Clipboard");
    },
    validation: { __type: FormValidation.Required },
  });

  const importURL = `raycast://extensions/eluce2/filemaker-snippets/view-snippets?context=${encodeURIComponent(
    JSON.stringify({
      type: "import",
      action: values.__action ?? "copy",
      snippet,
      showForm: false,
      values: {},
    } as ZLaunchContext)
  )}`;
  const urlTooLong = importURL.length > 2048;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Copy Deeplink" icon={Icon.CopyClipboard} />
          <Action.ShowInFinder
            path={snippet.path}
            title="Reveal in Finder"
            icon={Icon.Finder}
            shortcut={{ key: "r", modifiers: ["cmd", "opt"] }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a Deeplink to launch this snippet via URL" />
      <Form.Dropdown
        title="Type"
        {...(itemProps.__type as Form.ItemProps<string>)}
        placeholder="Select a type"
        info="Personal Deeplinks assume you already have the snippet on your system to reference. Shareable snippets can embed the snippet into the URL."
      >
        {deeplinkTypes.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={type === "import" ? "Shareable" : "Personal"} />
        ))}
      </Form.Dropdown>

      {values.__type === "import" && (
        <>
          <Form.Dropdown
            {...(itemProps.__action as Form.ItemProps<string>)}
            title="Action"
            info="Should this Deeplink prompt the user to import to their library, or just copy to Clipboard?"
          >
            <Form.Dropdown.Item key="copy" value="copy" title="Copy to Clipboard" />
            <Form.Dropdown.Item key="import" value="import" title="Import to Library" />
          </Form.Dropdown>
          {urlTooLong && (
            <>
              <Form.Description
                text={`Your snippet is too large to fit in the URL. Use the "Reveal in Finder" action to get the raw JSON file and host it publicly for others to download when clicking your Deeplink.`}
              />
              <Form.Description
                text={`Alternatively, if you know that other users will already have this snippet on their system, use the "Personal" Deeplink type which will reference it by UUID in the Deeplink.`}
              />
              <Form.TextField {...itemProps.__url} title="Hosted URL to Snippet" />
            </>
          )}
        </>
      )}

      {snippet.dynamicFields.length > 0 && (
        <>
          <Form.Dropdown {...(itemProps.__showForm as Form.ItemProps<string>)} title="Dynamic Fields">
            <Form.Dropdown.Item key="true" value="true" title="Show Form" />
            <Form.Dropdown.Item key="false" value="false" title="Use Prefilled/Default Values" />
          </Form.Dropdown>
          <Form.Separator />
          <Form.Description text="Prefill the dynamic fields for this Deeplink" title="Optional" />
          <>
            {snippet.dynamicFields.map((field) => {
              if (field.type === "text") {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return <Form.TextField {...itemProps[field.name]} title={field.nameFriendly} />;
              }
              if (field.type === "dropdown") {
                return (
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  <Form.Dropdown {...itemProps[field.name]} title={field.nameFriendly}>
                    {field.values.map((val) => (
                      <Form.Dropdown.Item key={val} value={val} title={val} />
                    ))}
                  </Form.Dropdown>
                );
              }
              return null;
            })}
          </>
        </>
      )}
    </Form>
  );
}
