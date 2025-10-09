import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, useLocalStorage } from "@raycast/utils";
import BrandDev from "brand.dev";
import { API_HEADERS, API_URL, parseBrandDevResponse } from "./common";

type Screenshot = {domain: string; screenshot: string; screenshotType: "viewport" | "page"}
type ScreenshotInStorage = Screenshot & {
  created_on: string;
  updated_on: string;
};
export default function TakeScreenshot() {
    const { isLoading, value: screenshots = [], setValue: setScreenshots } = useLocalStorage<ScreenshotInStorage[]>("screenshots", []);
    
    return <List isLoading={isLoading} actions={<ActionPanel>
        <Action.Push icon={Icon.Camera} title="Take Screenshot" target={<TakeScreenshotForm />} />
    </ActionPanel>}>

    </List>
}

function TakeScreenshotForm() {
    type FormValues = {
        domain: string;
        fullScreenshot: boolean
        page:string
        prioritize: string;
    }
    const {handleSubmit, itemProps} = useForm<FormValues>({
        async onSubmit(values) {
            const toast = await showToast(Toast.Style.Animated, "Screenshotting", values.domain);
            const params = new URLSearchParams({
                domain: values.domain,
                fullScreenshot: values.fullScreenshot ? "true" : "false",
                prioritize: values.prioritize==="quality" ? "quality" : "speed"
            })
            if (values.page) params.append("page", values.page);
            try {
                const response = await fetch(API_URL + `screenshot?${params}`, {
                    headers: API_HEADERS
                });
                const result = await parseBrandDevResponse<Screenshot>(response);
            } catch (error) {
                let message = `${error}`;
                    if (error instanceof BrandDev.APIError) {
                        const err = error.error;
                        message = (err.message && Array.isArray(err.message)) ? err.message[0]?.message : err.message ?? err.error_code;
                    }
                toast.style = Toast.Style.Failure;
                toast.title = "Failed";
                toast.message = message;
            }
        },
        validation: {
            domain: FormValidation.Required
        }
    })
    return <Form actions={<ActionPanel>
        <Action.SubmitForm icon={Icon.Camera} title="Take Screenshot" onSubmit={handleSubmit} />
    </ActionPanel>}>
        <Form.TextField title="Domain" placeholder="brand.dev" {...itemProps.domain} />
        <Form.Separator />
        <Form.Checkbox label="Full Screenshot" {...itemProps.fullScreenshot} info="If 'true', takes a full page screenshot capturing all content. If 'false' or not provided, takes a viewport screenshot (standard browser view)." />
        <Form.Dropdown title="Page" {...itemProps.page}>
            <Form.Dropdown.Item title="Default (Landing)" value="" />
            {['login' , 'signup' , 'blog' , 'careers' , 'pricing' , 'terms' , 'privacy' , 'contact'].map(p => <Form.Dropdown.Item key={p} title={p.charAt(0).toUpperCase() + p.slice(1)} value={p} />)}
        </Form.Dropdown>
        <Form.Dropdown title="Prioritize" {...itemProps.prioritize}>
            <Form.Dropdown.Item title="Quality" value="quality" />
            <Form.Dropdown.Item title="Speed" value="speed" />
        </Form.Dropdown>
    </Form>
}