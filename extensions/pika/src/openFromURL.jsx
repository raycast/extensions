import { useState } from "react";
import { Form, Action, ActionPanel, showHUD, environment } from "@raycast/api";
const urlPrefix = environment.isDevelopment ? `http://localhost:3000` : `https://pika.style`;

export default function Command() {
  const [formData, setFormData] = useState({ url: "", urlError: null, isDirty: false });

  const makeURL = () => {
    const prefix = `${urlPrefix}/?utm_source=Pika%20for%20Raycast(URL)&use=`;

    if (!formData?.url?.startsWith("http://") && !formData?.url?.startsWith("https://")) {
      return `${prefix}https://${formData?.url}`;
    } else {
      return `${prefix}${formData?.url}`;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in pika.style"
            url={makeURL()}
            onOpen={async () => await showHUD("Opening in pika.style...")}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        error={formData?.urlError}
        title="Enter Website/Image URL"
        placeholder="website.com or website.com/landing.png"
        storeValue={true}
        value={formData?.url}
        onChange={(e) => {
          setFormData({
            isDirty: true,
            url: e,
            urlError: formData?.isDirty && !isValidURLRegex(e) ? "Invalid URL" : null,
          });
        }}
      />
    </Form>
  );
}

const isValidURLRegex = (url) => {
  var expression = /[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)?/gi;
  var regex = new RegExp(expression);

  return url.match(regex);
};
