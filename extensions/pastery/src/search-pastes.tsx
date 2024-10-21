import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { API_URL } from "./constants";
import { ActionResult, Paste } from "./types";
import fetch from "node-fetch";

const generateApiUrl = (route="") => {
    const { api_key } = getPreferenceValues<Preferences>();
    const url = new URL(`api/paste/${route}`, API_URL);
    const params = new URLSearchParams({ api_key });
    return url + "?" + params;
}

export default function SearchPastes() {
    
    const {isLoading, data: pastes, mutate } = useFetch(generateApiUrl(), {
        mapResult(result: { pastes: Paste[] }) {
            return {
                data: result.pastes
            };
        },
        initialData: []
    });

    const deletePaste = async (id: string) => {
        const toast = await showToast(Toast.Style.Animated, "Deleting Paste", id);
        
        try {
            await mutate(
                fetch(generateApiUrl(id), { method: "DELETE" })
                .then(res => res.json()).then(res => {
                    const json = res as ActionResult;
                    if (json.result=="error") throw new Error(json.error_msg);
                })
                ,
                {
                    optimisticUpdate(data) {
                        const index = data.findIndex(paste => paste.id===id);
                        if (index>-1) data.splice(index, 1);
                        return data;
                    },
                }
            )
            toast.style = Toast.Style.Success;
            toast.title = "Deleted Paste";
        } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = `${error}`;
        }
    }

    return <List isLoading={isLoading} searchBarPlaceholder="Search pastes">
        {!isLoading && !pastes.length ? <List.EmptyView title="Pastes" description="You haven't created any pastes…yet!" />
        : pastes.map(paste => <List.Item key={paste.id} title={paste.title} subtitle={paste.url} accessories={[
            { tag: paste.language},
            { text: paste.duration + " min" }
        ]} actions={<ActionPanel>
            <Action.OpenInBrowser icon="pastery.png" url={paste.url} />
            <Action icon={Icon.Trash} title="Delete Paste" style={Action.Style.Destructive} onAction={() => deletePaste(paste.id)} />
        </ActionPanel>} />)}
    </List>
}

function CreatePaste() {
    type FormValues = {
        text: string;
        duration: string;
        title: string;
        language: string;
        max_views: string;
    }

    const { itemProps } = useForm<FormValues>({
        onSubmit(values) {
            
        },
        validation: {
            text: FormValidation.Required
        }
    })

    // const {  } = useFetch("https://www.pastery.net/api/paste/")

    return <Form isLoading actions={<ActionPanel>
        <Action.SubmitForm title="Create" />
    </ActionPanel>}>
        <Form.TextArea title="Text" placeholder="The text of the paste" {...itemProps.text} />
        <Form.Separator />
        <Form.Description text="Optional" />
        <Form.TextField title="Title" placeholder="The title of the paste" {...itemProps.title} />
    </Form>
}