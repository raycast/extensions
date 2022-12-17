import { Saver } from "../core/saver"
import { RaycastAdapter } from "../adapters/raycast/adapter"
import { useState } from "react"
import { Action, ActionPanel, Form } from "@raycast/api"
import { Page } from "../core/dm"
import { DONATION_URL } from "../config"

export type SaveToLastProps = {
    saver: Saver,
    copiedText: string,
    lastSelectedPage: LastSelectedPage,
    raycastAdapter: RaycastAdapter,
}

export type LastSelectedPage = Page | Error | undefined

export function SaveToLast(props: SaveToLastProps) {
    const [text, setText] = useState<string>(props.copiedText)

    async function handleSave(page: LastSelectedPage, text: string) {
        if (!(page instanceof Page)) {
            return
        }

        const toast = await props.raycastAdapter.showLoading("saving...")

        const rs = await props.saver.save(page, text, "")
        if (rs instanceof Error) {
            console.error(`${rs}: save page`)
            props.raycastAdapter.setToastError(toast, new Error("cannot save"))
            return
        }

        await props.raycastAdapter.showHUD(`Saved to '${page.title}' ✅`)
        await props.raycastAdapter.closeExtension()
    }

    let lastPageSection = <></>
    if (props.lastSelectedPage instanceof Page) {
        lastPageSection = (
            <>
                <Form.Separator />
                <Form.Description title={"Save to"} text={
                    props.lastSelectedPage.icon + " " + props.lastSelectedPage.title + "\n" + "(last selected page)" + "\n"
                } />
            </>
        )
    } else {
        lastPageSection = (
            <>
                <Form.Separator />
                <Form.Description title={"Save to"} text="Error getting last selected page" />
            </>
        )
    }

    const actions = (
        <ActionPanel>
            <ActionPanel.Section>
                <Action title="Save" onAction={() => handleSave(props.lastSelectedPage, text)}
                        icon="notion_icon.png" />
            </ActionPanel.Section>

            <ActionPanel.Section>
                <Action.OpenInBrowser url={DONATION_URL} title={"Buy us a coffee"} icon="bmcbrand/bmc-logo.svg" />
            </ActionPanel.Section>
        </ActionPanel>
    )


    return (
        <Form actions={actions}>
            <Form.TextArea id="text" title={"Copied text"} value={props.copiedText} onChange={setText} />

            {lastPageSection}

            <Form.Separator />
            <Form.Description
                text="If you like this extension, consider buying us a coffee by clicking <Actions> below.
Thank you 🤝"
            />
        </Form>
    )
}