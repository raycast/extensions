import {
    Action,
    ActionPanel,
    Clipboard,
    Form,
    popToRoot,
    showToast,
    Toast,
} from "@raycast/api"
import {FormValidation, useForm, useLocalStorage} from "@raycast/utils"
import {useState} from "react"

import {createGoUrl, createLink} from "~/links"
import type {Link, LinkForm} from "~/types"

const Command = () => {
    const {
        value: links,
        setValue: setLinks,
        isLoading,
    } = useLocalStorage<Link[]>("go-links", [])

    const [name, setName] = useState("stripe")
    const [description, setDescription] = useState("Stripe home page.")

    const onSubmit = (link: LinkForm) => {
        if (links === undefined) {
            return
        }

        const newLinks = createLink(links, name, description)
        setLinks(newLinks)

        Clipboard.copy(createGoUrl(link.name))
        popToRoot()

        showToast({
            title: "Link created and copied",
            style: Toast.Style.Success,
        })
    }

    const {handleSubmit, itemProps} = useForm<LinkForm>({
        onSubmit,
        validation: {
            name: FormValidation.Required,
            description: FormValidation.Required,
        },
    })

    return (
        <Form
            isLoading={isLoading}
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Create Link"
                        onSubmit={handleSubmit}
                    />
                </ActionPanel>
            }
        >
            <Form.Description text="Save a go link for reference later." />

            <Form.TextField
                {...itemProps.name}
                title="Name"
                placeholder="Enter text"
                value={name}
                onChange={setName}
            />

            <Form.TextField
                {...itemProps.description}
                title="Description"
                placeholder="Enter text"
                value={description}
                onChange={setDescription}
            />

            <Form.Separator />
            <Form.Description title="Preview" text={createGoUrl(name)} />
        </Form>
    )
}

export default Command
