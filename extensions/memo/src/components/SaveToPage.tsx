import { Action, ActionPanel, Form } from "@raycast/api"
import { PageSearch } from "./PageSearch"
import { Saver } from "../core/saver"
import { useEffect, useState } from "react"
import { DONATION_URL } from "../config"
import { RaycastAdapter } from "../adapters/raycast/adapter"

export type HomeProps = {
    copiedText: string,
    setErr: (err: Error) => void,
    saver: Saver,
    raycastAdapter: RaycastAdapter,
}

export function SaveToPage(props: HomeProps) {
    const [urlTitle, setURLTitle] = useState<string>('')
    const [isParsingText, setIsParsingText] = useState<boolean>()
    const [text, setText] = useState<string>(props.copiedText)

    useEffect(() => {
        async function parse() {
            if (!text) {
                return
            }

            setIsParsingText(true)
            const toast = await props.raycastAdapter.showLoading("parsing")

            const url = await props.saver.getURLTitle(text)
            if (url instanceof Error) {
                console.info(url.message)
                setIsParsingText(false)
                await props.raycastAdapter.setToastSuccess(toast, "")
                return
            }

            setURLTitle(url)
            setIsParsingText(false)
            await props.raycastAdapter.setToastSuccess(toast, "")
        }

        parse()
    }, [text])

    const actions = (
        <ActionPanel>
            <ActionPanel.Section title={'Save to'}>
                <Action.Push title="Save to Notion..."
                             target={<PageSearch saver={props.saver} raycastAdapter={props.raycastAdapter} copiedText={text} pageTitle={urlTitle}/>} icon={"notion_icon.png"}/>
            </ActionPanel.Section>

            <ActionPanel.Section>
                <Action.OpenInBrowser url={DONATION_URL} title={"Buy us a coffee"} icon="bmcbrand/bmc-logo.svg"/>
            </ActionPanel.Section>
        </ActionPanel>
    )

    return (
        <Form
            isLoading={isParsingText}
            actions={actions}
        >
            <Form.TextArea id="text" title={"Copied text"} value={text} onChange={setText}/>

            <Form.Separator/>

            {
                isParsingText ? (
                    <Form.Description text={"Parsing... ⏳"}/>
                ) : (
                    <Form.TextArea
                        autoFocus={true}
                        title={'Page Title'}
                        value={urlTitle || ""}
                        placeholder={"Untitled"}
                        onChange={setURLTitle}
                        id={"url_title"}/>
                )
            }

            <Form.Separator />

            <Form.Description
                text="If you like this extension, consider buying us a coffee by clicking <Actions> below.
Thank you 🤝"
            />

        </Form>
    )
}