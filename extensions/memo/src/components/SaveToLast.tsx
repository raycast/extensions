import { Saver } from "../core/saver"
import { RaycastAdapter } from "../adapters/raycast/adapter"
import { useState } from "react"
import { Action, ActionPanel, Form } from "@raycast/api"
import { Page } from "../core/dm"
import { DONATION_URL } from "../config"

export type SaveToLastProps = {
    saver: Saver
    copiedText: string
    lastSelectedPage: Page
    raycastAdapter: RaycastAdapter
}

export function SaveToLast(props: SaveToLastProps) {
    const [text, setText] = useState<string>(props.copiedText)

    async function handleSave(page: Page, text: string) {
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

    const lastPageSection = (
        <>
            <Form.Separator />
            <Form.Description
                title={"Save to"}
                text={
                    props.lastSelectedPage.icon +
                    " " +
                    props.lastSelectedPage.title +
                    "\n" +
                    "(last selected page)" +
                    "\n"
                }
            />
        </>
    )

    const actions = (
        <ActionPanel>
            <ActionPanel.Section>
                <Action title="Save" onAction={() => handleSave(props.lastSelectedPage, text)} icon="notion_icon.png" />
            </ActionPanel.Section>

            <ActionPanel.Section>
                <Action.OpenInBrowser url={DONATION_URL} title={"Buy Us a Coffee"} icon="bmcbrand/bmc-logo.svg" />
            </ActionPanel.Section>
        </ActionPanel>
    )

    return (
        <Form actions={actions}>
            <Form.TextArea id="text" title={"Copied text"} value={text} onChange={setText} />

            {lastPageSection}
        </Form>
    )
}
