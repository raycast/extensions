import { getSelectedText, ActionPanel, Form, Action, Clipboard, popToRoot } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export default function ProtectLink() {
  let [URL, setURL] = useState("");

  const [urlError, setUrlError] = useState();

  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setURL(await getSelectedText());
      } catch {
        setURL("");
      }
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Protected Link"
            onSubmit={async (values) => {
              showToast({
                title: "Generating link...",
                style: Toast.Style.Animated,
              });

              try {
                await fetch("https://api.shrtco.de/v2/shorten", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  },
                  body: `url=${URL}&password=${values.password}`,
                })
                  .then((response) => response.json())
                  .then((json) => {
                    try {
                      let {
                        result: { short_link },
                      } = json;
                      Clipboard.copy(short_link);
                      popToRoot();

                      showToast({
                        title: "Password protected link copied",
                        style: Toast.Style.Success,
                      });
                    } catch {
                      popToRoot();
                      switch (json.error_code) {
                        case 2:
                          showToast({
                            title: "Please use a valid URL",
                            style: Toast.Style.Failure,
                          });
                          break;
                        case 3:
                          showToast({
                            title: "Hit the rate limit (1 request per second)",
                            message: "Please wait a little and try again",
                            style: Toast.Style.Failure,
                          });
                          break;
                        case 4:
                          showToast({
                            title: "Your IP address has been blocked by shrtco.",
                            style: Toast.Style.Failure,
                          });
                          break;
                        case 10:
                          showToast({
                            title: "Cannot use that link",
                            style: Toast.Style.Failure,
                          });
                          break;
                        default:
                          showToast({
                            title: "Failed to generate link",
                            style: Toast.Style.Failure,
                          });
                      }
                    }
                  });
              } catch (e) {
                popToRoot();
                showToast({
                  title: "Failed to generate link",
                  style: Toast.Style.Failure,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="link"
        value={URL}
        onChange={setURL}
        error={urlError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("Please provide a link");
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
        title="Link to Protect"
      />
      <Form.PasswordField id="password" title="Password to Protect With" />
      <Form.Description text="If you do not provide a password, your link will just be shortened." />
    </Form>
  );
}
