import { useEffect, useState } from "react"
import { AuthService, NotionApiToken } from "../domain/services/auth"
import { Api as RaycastApi } from "../raycast/api"
import { NewRaycastAdapter } from "../adapters/raycast/impl"
import { NewWebAdapter } from "../adapters/web/impl"
import { Api as WebApi } from "../web/api"
import { Saver } from "../core/saver"
import { Detail } from "@raycast/api"
import { ApiImpl as NotionApi } from "../notion/api"
import { NotionAdapter } from "../core/adapters"
import { SaveToPage } from "./SaveToPage"
import { SaveToLast } from "./SaveToLast"
import { Empty } from "./Empty"
import { Page } from "../core/dm"

export enum BootstrapFlow {
    SelectCustomPage,
    SelectLastPage,
}

export type BootstrapProps = {
    flow: BootstrapFlow
}

/**
 * if === undefined: initializing
 * if typeof 'string': load finished
 */
type CopiedTextState = undefined | string

/**
 * if === undefined: initializing
 * if instanceof NotionApiToken: authorized
 * if instanceof Error: not authorized
 */
type NotionTokenState = undefined | NotionApiToken | Error

/**
 * undefined: initializing
 * LastSelectedPage: the page exists
 * null: no last selected page
 */
type LastSelectedPageState = undefined | Page | null

/**
 * NewApp is a constructor. It set up services and data to be ready
 * to construct the extension main pages.
 */
export default function NewApp(props: BootstrapProps) {
    const [copiedText, setCopiedText] = useState<CopiedTextState>(undefined)
    const [notionToken, setNotionToken] = useState<NotionTokenState>(undefined)
    const [lastSelectedPage, setLastSelectedPage] = useState<LastSelectedPageState>(undefined)

    const raycastApi = new RaycastApi()
    const raycastAdapter = NewRaycastAdapter(raycastApi)
    const webAdapter = NewWebAdapter(new WebApi())
    const authService = new AuthService(raycastAdapter, webAdapter)

    useEffect(() => {
        ;(async () => {
            console.debug("authorizing")
            const toast = await raycastAdapter.showLoading("authorizing")

            const token = await authService.authorizeNotion()
            if (token instanceof Error) {
                console.error(token)
                raycastAdapter.setToastError(toast, token)
            } else {
                console.info("notion authorization successful")
                raycastAdapter.setToastSuccess(toast, "authorized")
            }

            setNotionToken(token)
        })()
    }, [])

    // only available after Notion authorization
    let saver: Saver | undefined = undefined

    useEffect(() => {
        async function getCopiedText() {
            if (!saver) {
                return
            }
            console.debug("getting copied text")

            const toast = await raycastAdapter.showLoading("getting copied content")

            const text = await saver.getCopiedText()
            if (text instanceof Error) {
                console.error(text)
                await raycastAdapter.setToastError(toast, text)
                setCopiedText("")
                return
            }

            setCopiedText(text)
            await raycastAdapter.setToastSuccess(toast, "received copied text")
        }

        getCopiedText()
    }, [notionToken])

    useEffect(() => {
        async function doGet() {
            if (props.flow != BootstrapFlow.SelectLastPage) {
                setLastSelectedPage(null)
                return
            }
            console.debug("getting last selected page")

            const toast = await raycastAdapter.showLoading("getting last selected page")

            const page = await raycastAdapter.getPersistedLastSelectedPage()
            if (page instanceof Error) {
                console.error(`${page}: save_to_last`)
                await raycastAdapter.setToastError(toast, new Error("last selected page not found"))
                setLastSelectedPage(null)
                return
            }

            setLastSelectedPage(page)
            await raycastAdapter.setToastSuccess(toast, "last selected page found")
        }

        doGet()
    }, [])

    // Notes:
    // We must always declare all the `useEffect`
    // blocks everytime. If we add new blocks after
    // some conditions are satisfied then React would
    // throw error:
    // "Rendered more hooks than during the previous render."

    if (notionToken === undefined) {
        return <Empty />
    } else if (notionToken instanceof Error) {
        return <Detail markdown={"Not authorized for Notion. Please try again."} />
    }

    const notionApi = new NotionApi(notionToken)
    const notionAdapter = new NotionAdapter(notionApi)
    saver = new Saver(notionAdapter, raycastAdapter, webAdapter)

    if (copiedText === undefined) {
        return <Empty />
    }

    if (lastSelectedPage === undefined) {
        return <Empty />
    }

    if (props.flow === BootstrapFlow.SelectLastPage && lastSelectedPage instanceof Page) {
        console.info("flow: ", BootstrapFlow.SelectLastPage)
        return (
            <SaveToLast
                saver={saver}
                copiedText={copiedText}
                lastSelectedPage={lastSelectedPage}
                raycastAdapter={raycastAdapter}
            />
        )
    }

    console.info("flow: ", BootstrapFlow.SelectCustomPage)
    return <SaveToPage copiedText={copiedText} saver={saver} raycastAdapter={raycastAdapter} />
}
