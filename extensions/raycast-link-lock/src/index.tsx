import { getSelectedText, ActionPanel, Form, Action, Clipboard, popToRoot } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

export default function ProtectLink() {
  useEffect(() => {
    (async () => {
      try {
        let selectedText = await getSelectedText();
        selectedText = selectedText.replace(/\s+/g, " ").trim();
        if (isValidHttpUrl(selectedText)) {
          setValue("link", selectedText);
        }
      } catch {
        console.log("err!");
      }
    })();
  }, []);

  interface FormValues {
    link: string;
    password: string;
  }

  interface Response {
    ok: boolean;
    error_code: number;
    result: {
      code: string;
      full_short_link: string;
      full_short_link2: string;
      full_short_link3: string;
      original_link: string;
      share_link: string;
      short_link: string;
    };
  }

  const isValidHttpUrl = (string: string) => {
    let url;

    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
  };

  const { handleSubmit, itemProps, setValue, setValidationError } = useForm<FormValues>({
    async onSubmit(values) {
      if (!isValidHttpUrl(values.link)) {
        setValidationError("link", "Please use a valid URL");
        return;
      }

      const toast = await showToast({
        title: "Generating link...",
        style: Toast.Style.Animated,
      });

      try {
        await fetch("https://api.shrtco.de/v2/shorten", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: `url=${values.link}&password=${values.password}`,
        })
          .then((response) => response.json())
          .then(async (json) => {
            const response = json as Response;

            try {
              Clipboard.copy(response.result.full_short_link);

              toast.title = "Password protected link copied";
              toast.style = Toast.Style.Success;
            } catch {
              toast.style = Toast.Style.Failure;
              switch (response.error_code) {
                case 2:
                  toast.title = "Please use a valid URL";
                  break;
                case 3:
                  toast.title = "Hit the rate limit (1 request per second)";
                  toast.message = "Please wait a little and try again";
                  break;
                case 4:
                  toast.title = "Your IP address has been blocked by shrtco.";
                  break;
                case 10:
                  toast.title = "Cannot use that link";
                  break;
                default:
                  toast.title = "Failed to generate link";
              }
            }
          });
      } catch (e) {
        toast.title = "Failed to generate link";
      } finally {
        await popToRoot();
      }
    },
    validation: {
      link: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Protected Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Link to Protect" {...itemProps.link} />
      <Form.PasswordField title="Password to Protect With" {...itemProps.password} />
      <Form.Description text="If you do not provide a password, your link will just be shortened." />
    </Form>
  );
}
