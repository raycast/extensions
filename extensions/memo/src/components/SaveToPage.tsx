import { Action, ActionPanel, Form } from "@raycast/api"
import { PageSearch } from "./PageSearch"
import { Saver } from "../core/saver"
import { useEffect, useState } from "react"
import { DONATION_URL } from "../config"
import { RaycastAdapter } from "../adapters/raycast/adapter"
import { MetaActionSection } from "./MetaActionSection"

export type HomeProps = {
    copiedText: string
    saver: Saver
    raycastAdapter: RaycastAdapter
}

export function SaveToPage(props: HomeProps) {
    const [urlTitle, setURLTitle] = useState<string>("")
    const [isParsingText, setIsParsingText] = useState<boolean>(true)
    const [text, setText] = useState<string>(props.copiedText)

    useEffect(() => {
        async function parse() {
            setIsParsingText(true)

            if (!text) {
                setIsParsingText(false)
                return
            }

            const url = await props.saver.getURLTitle(text)
            if (url instanceof Error) {
                console.info(url.message)
                setIsParsingText(false)
                return
            }

            setURLTitle(url)
            setIsParsingText(false)
        }

        parse()
    }, [text])

    const actions = (
        <ActionPanel>
            <ActionPanel.Section title={"Save to"}>
                <Action.Push
                    title="Save to Notion..."
                    target={
                        <PageSearch
                            saver={props.saver}
                            raycastAdapter={props.raycastAdapter}
                            copiedText={text}
                            pageTitle={urlTitle}
                        />
                    }
                    icon={"notion_icon.png"}
                />
            </ActionPanel.Section>

            <MetaActionSection />
        </ActionPanel>
    )

    return (
        <Form isLoading={isParsingText} actions={actions}>
            <Form.TextArea id="text" title={"Copied text"} value={text} onChange={setText} autoFocus={false} />

            <Form.Separator />

            {isParsingText ? (
                <Form.TextArea
                    autoFocus={true}
                    title={"Page Title"}
                    value={urlTitle}
                    placeholder={"Untitled"}
                    id={"url_title"}
                />
            ) : (
                <Form.TextArea
                    autoFocus={true}
                    title={"Page Title"}
                    value={urlTitle || ""}
                    placeholder={"Untitled"}
                    onChange={setURLTitle}
                    id={"url_title"}
                />
            )}
        </Form>
    )
}
